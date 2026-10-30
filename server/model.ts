import Anthropic from '@anthropic-ai/sdk'
import type { Prompt } from './prompt.ts'

export const DEFAULT_MODELS = { es: 'claude-sonnet-5-5', en: 'claude-haiku-5-5' } as const
const CONNECT_TIMEOUT_MS = 20_000
const MAX_TOKENS = 1000

export interface ModelConfig {
  apiKey: string
  model: string
}

export class ModelError extends Error {
  readonly busy: boolean

  constructor(message: string, busy = false) {
    super(message)
    this.name = 'ModelError'
    this.busy = busy
  }
}

function noThinking(model: string): Anthropic.ThinkingConfigParam {
  return model.startsWith('claude-sonnet-5-5') ? { type: 'between_tools' } : { type: 'disabled' }
}

function toModelError(err: unknown): ModelError {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new ModelError('model timed out')
  if (err instanceof Anthropic.APIConnectionError) return new ModelError('model unreachable')
  if (err instanceof Anthropic.APIError) {
    return new ModelError(`model responded ${err.status}`, err.status === 429 || err.status === 529)
  }
  return new ModelError('model failed')
}

export async function streamCompletion(
  config: ModelConfig,
  { system, messages }: Prompt,
  signal?: AbortSignal,
): Promise<AsyncGenerator<string>> {
  const client = new Anthropic({ apiKey: config.apiKey, timeout: CONNECT_TIMEOUT_MS, maxRetries: 1 })
  const stream = client.messages.stream(
    {
      model: config.model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      thinking: noThinking(config.model),
      output_config: { effort: 'medium' },
    },
    { signal },
  )

  const events = stream[Symbol.asyncIterator]()
  let first: IteratorResult<Anthropic.MessageStreamEvent>
  try {
    first = await events.next()
  } catch (err) {
    if (signal?.aborted) throw err
    throw toModelError(err)
  }
  return textDeltas(first, events, stream)
}

async function* textDeltas(
  first: IteratorResult<Anthropic.MessageStreamEvent>,
  events: AsyncIterator<Anthropic.MessageStreamEvent>,
  stream: { abort(): void },
): AsyncGenerator<string> {
  let finished = false
  try {
    for (let next = first; !next.done; next = await events.next()) {
      const event = next.value
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta' && event.delta.text) {
        yield event.delta.text
      } else if (event.type === 'message_delta' && event.delta.stop_reason === 'refusal') {
        throw new ModelError('model refused')
      }
    }
    finished = true
  } catch (err) {
    throw err instanceof ModelError ? err : toModelError(err)
  } finally {
    if (!finished) stream.abort()
  }
}
