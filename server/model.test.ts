import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { ModelError, streamCompletion } from './model.ts'

const config = { apiKey: 'key', model: 'gemma-4-31B-it', baseUrl: 'https://inference.example/v1/' }
const prompt = { system: 'Escribe calaveritas.', messages: [{ role: 'user' as const, content: 'Para Rosa' }] }
const realFetch = globalThis.fetch

function sse(...pieces: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece))
      controller.close()
    },
  })
}

function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let out = ''
  for await (const chunk of stream) out += chunk
  return out
}

describe('streamCompletion', () => {
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('sends an OpenAI-style chat request and yields the text deltas', async () => {
    let request: { url: string; body: Record<string, unknown>; auth: string | null } | undefined
    globalThis.fetch = async (url, init) => {
      request = {
        url: String(url),
        body: JSON.parse(String(init?.body)),
        auth: new Headers(init?.headers).get('Authorization'),
      }
      const event = delta('campante\n')
      return new Response(sse(delta('Iba Rosa '), event.slice(0, 20), event.slice(20), 'data: [DONE]\n\n'))
    }

    const out = await collect(await streamCompletion(config, prompt))
    assert.equal(out, 'Iba Rosa campante\n')
    assert.equal(request?.url, 'https://inference.example/v1/chat/completions')
    assert.equal(request?.auth, 'Bearer key')
    assert.equal(request?.body.model, 'gemma-4-31B-it')
    assert.equal(request?.body.stream, true)
    assert.deepEqual(request?.body.messages, [
      { role: 'system', content: 'Escribe calaveritas.' },
      { role: 'user', content: 'Para Rosa' },
    ])
  })

  it('reports a busy model on 429 and 503', async () => {
    for (const status of [429, 503]) {
      globalThis.fetch = async () => new Response('busy', { status })
      await assert.rejects(streamCompletion(config, prompt), (err) => err instanceof ModelError && err.busy)
    }
  })

  it('reports other failures as not busy', async () => {
    globalThis.fetch = async () => new Response('nope', { status: 401 })
    await assert.rejects(streamCompletion(config, prompt), (err) => err instanceof ModelError && !err.busy)
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed')
    }
    await assert.rejects(streamCompletion(config, prompt), (err) => err instanceof ModelError && err.message === 'model unreachable')
  })

  it('treats a content filter stop as a refusal', async () => {
    globalThis.fetch = async () =>
      new Response(sse(delta('Iba '), `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'content_filter' }] })}\n\n`))
    await assert.rejects(collect(await streamCompletion(config, prompt)), (err) => err instanceof ModelError && err.message === 'model refused')
  })
})
