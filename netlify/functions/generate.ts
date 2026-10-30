import type { VerseContext } from '../../server/final-check.ts'
import { mockVerseChunks } from '../../server/mock-model.ts'
import { DEFAULT_BASE_URL, DEFAULT_MODEL, ModelError, streamCompletion } from '../../server/model.ts'
import { isBlocked, moderatedVerse } from '../../server/moderation.ts'
import { buildPrompt } from '../../server/prompt.ts'
import { blobStore, DEFAULT_LIMIT, takeSlot, visitorKey, type RateDecision } from '../../server/rate-limit.ts'
import { parseInput } from '../../src/input.ts'

const MAX_BODY_BYTES = 4096

function errorResponse(status: number, error: string, extra: Record<string, unknown> = {}, headers: HeadersInit = {}): Response {
  return Response.json({ error, ...extra }, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

function quotaHeaders({ limit, remaining, resetSec }: RateDecision): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetSec),
  }
}

async function checkRateLimit(ip: string): Promise<RateDecision | null> {
  const limit = Number(process.env.RATE_LIMIT_MAX) || DEFAULT_LIMIT
  try {
    return await takeSlot(blobStore(), visitorKey(ip, process.env.RATE_LIMIT_SALT ?? ''), limit)
  } catch (err) {
    console.error('generate: rate limit store failed', err instanceof Error ? err.message : 'unknown error')
    return null
  }
}

function textStream(chunks: AsyncGenerator<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await chunks.next()
        if (done) controller.close()
        else controller.enqueue(encoder.encode(value))
      } catch (err) {
        console.error('generate: stream failed', err instanceof Error ? err.message : 'unknown error')
        controller.error(err)
      }
    },
    async cancel() {
      await chunks.return(undefined)
    },
  })
}

export default async (req: Request, context: { ip?: string }): Promise<Response> => {
  if (req.method !== 'POST') return errorResponse(405, 'method')
  if (Number(req.headers.get('content-length')) > MAX_BODY_BYTES) return errorResponse(413, 'invalid')

  let body: { input?: Record<string, unknown>; lang?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'invalid')
  }

  const parsed = parseInput(body?.input ?? {})
  const lang = body?.lang
  if (!parsed.ok || (lang !== 'en' && lang !== 'es')) return errorResponse(400, 'invalid')

  const { name, occupation, traits } = parsed.input
  if (isBlocked([name, occupation, traits].join('\n'))) return errorResponse(422, 'blocked')

  const quota = await checkRateLimit(context.ip ?? 'unknown')
  if (quota && !quota.allowed) {
    return errorResponse(429, 'rateLimited', { retryAfter: quota.resetSec, limit: quota.limit }, {
      'Retry-After': String(quota.resetSec),
      ...quotaHeaders(quota),
    })
  }

  let start: () => Promise<AsyncGenerator<string>>
  if (process.env.USE_MOCK_MODEL === 'true') {
    start = async () => mockVerseChunks(parsed.input, lang, req.signal)
  } else {
    const { MODEL_ACCESS_KEY, MODEL_NAME, INFERENCE_BASE_URL } = process.env
    if (!MODEL_ACCESS_KEY) {
      console.error('generate: MODEL_ACCESS_KEY must be set (or USE_MOCK_MODEL=true)')
      return errorResponse(500, 'unavailable')
    }
    const config = {
      apiKey: MODEL_ACCESS_KEY,
      model: MODEL_NAME || DEFAULT_MODEL,
      baseUrl: INFERENCE_BASE_URL || DEFAULT_BASE_URL,
    }
    start = () => streamCompletion(config, buildPrompt(parsed.input, lang), req.signal)
  }

  let first: AsyncGenerator<string>
  try {
    first = await start()
  } catch (err) {
    if (err instanceof ModelError) {
      console.error('generate:', err.message)
      return err.busy ? errorResponse(503, 'busy') : errorResponse(502, 'unavailable')
    }
    throw err
  }

  const verseContext: VerseContext = { lang, pronouns: parsed.input.pronouns, source: [name, occupation, traits].join('\n') }
  return new Response(textStream(moderatedVerse(first, start, verseContext)), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(quota ? quotaHeaders(quota) : {}),
    },
  })
}
