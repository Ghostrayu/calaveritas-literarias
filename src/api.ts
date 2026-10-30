import type { Lang } from './i18n'
import type { CalaveritaInput } from './input'
import { STREAM_FAILED, STREAM_REFUSED, STREAM_RESET } from './stream-protocol'
import { cleanVerse } from './verse'

export type GenerateErrorCode = 'blocked' | 'busy' | 'invalid' | 'rateLimited' | 'refused' | 'timeout' | 'unavailable'

export class GenerateError extends Error {
  readonly code: GenerateErrorCode
  readonly retryAfter: number

  constructor(code: GenerateErrorCode, retryAfter = 0) {
    super(code)
    this.name = 'GenerateError'
    this.code = code
    this.retryAfter = retryAfter
  }
}

export interface Quota {
  limit: number
  remaining: number
  resetSec: number
}

const IDLE_TIMEOUT_MS = 20_000

interface GenerateOptions {
  signal?: AbortSignal
  onQuota?: (quota: Quota) => void
}

function codeForStatus(status: number): GenerateErrorCode {
  if (status === 429) return 'rateLimited'
  if (status === 503) return 'busy'
  if (status === 400 || status === 413) return 'invalid'
  if (status === 422) return 'blocked'
  return 'unavailable'
}

function readQuota(headers: Headers): Quota | null {
  const limit = Number(headers.get('X-RateLimit-Limit'))
  const remaining = Number(headers.get('X-RateLimit-Remaining'))
  const resetSec = Number(headers.get('X-RateLimit-Reset'))
  if (!limit || Number.isNaN(remaining)) return null
  return { limit, remaining, resetSec: resetSec || 0 }
}

function retryAfterSeconds(response: Response): number {
  const seconds = Number(response.headers.get('Retry-After'))
  return seconds > 0 ? seconds : 60
}

export async function generate(input: CalaveritaInput, lang: Lang, { signal, onQuota }: GenerateOptions = {}): Promise<string> {
  const idle = new AbortController()
  let timer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS)
  const resetTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS)
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, lang }),
      signal: signal ? AbortSignal.any([signal, idle.signal]) : idle.signal,
    })
    if (response.status === 429) throw new GenerateError('rateLimited', retryAfterSeconds(response))
    if (!response.ok || !response.body) throw new GenerateError(codeForStatus(response.status))
    const quota = readQuota(response.headers)
    if (quota) onQuota?.(quota)

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let raw = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      resetTimer()
      raw += value
      if (raw.includes(STREAM_REFUSED)) throw new GenerateError('refused')
      if (raw.includes(STREAM_FAILED)) throw new GenerateError('unavailable')
      const reset = raw.lastIndexOf(STREAM_RESET)
      if (reset !== -1) raw = raw.slice(reset + 1)
    }

    // Only the final verse is ever shown; drafts the server reset are discarded above.
    const verse = cleanVerse(raw)
    if (!verse) throw new GenerateError('unavailable')
    return verse
  } catch (err) {
    if (err instanceof GenerateError) throw err
    if (signal?.aborted) throw err
    if (idle.signal.aborted) throw new GenerateError('timeout')
    throw new GenerateError('unavailable')
  } finally {
    clearTimeout(timer)
  }
}
