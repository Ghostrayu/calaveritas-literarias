import type { Prompt } from './prompt.ts'

// Any OpenAI-compatible chat endpoint works: DigitalOcean serverless inference by default,
// or a local Ollama / vLLM server running the same open-weight model.
export const DEFAULT_MODEL = 'gemma-4-31B-it'
export const DEFAULT_BASE_URL = 'https://inference.do-ai.run/v1'
const CONNECT_TIMEOUT_MS = 20_000
const MAX_TOKENS = 1000

export interface ModelConfig {
  apiKey: string
  model: string
  baseUrl: string
}

export class ModelError extends Error {
  readonly busy: boolean

  constructor(message: string, busy = false) {
    super(message)
    this.name = 'ModelError'
    this.busy = busy
  }
}

interface ChatChunk {
  error?: unknown
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[]
}

export async function streamCompletion(
  config: ModelConfig,
  { system, messages }: Prompt,
  signal?: AbortSignal,
): Promise<AsyncGenerator<string>> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, CONNECT_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new ModelError(timedOut ? 'model timed out' : 'model unreachable')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok || !response.body) {
    controller.abort()
    const { status } = response
    throw new ModelError(`model responded ${status}`, status === 429 || status === 503 || status === 529)
  }
  return textDeltas(response.body, controller)
}

function parseEvent(data: string): ChatChunk {
  try {
    return JSON.parse(data) as ChatChunk
  } catch {
    throw new ModelError('model sent malformed data')
  }
}

// Reads the server-sent events of a streamed chat completion and yields the text deltas.
async function* textDeltas(body: ReadableStream<Uint8Array>, controller: AbortController): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false
  try {
    for (;;) {
      let next: ReadableStreamReadResult<Uint8Array>
      try {
        next = await reader.read()
      } catch {
        throw new ModelError('model stream failed')
      }
      if (next.done) break
      buffer += decoder.decode(next.value, { stream: true })

      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice('data:'.length).trim()
        if (data === '[DONE]') {
          finished = true
          return
        }
        const event = parseEvent(data)
        if (event.error) throw new ModelError('model failed')
        const choice = event.choices?.[0]
        if (choice?.finish_reason === 'content_filter') throw new ModelError('model refused')
        if (choice?.delta?.content) yield choice.delta.content
      }
    }
    finished = true
  } finally {
    if (!finished) controller.abort()
    reader.releaseLock()
  }
}
