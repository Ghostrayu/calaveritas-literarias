import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { takeSlot, visitorKey, WINDOW_MS, type RateStore } from './rate-limit.ts'

function memoryStore(): RateStore & { data: Map<string, number[]> } {
  const data = new Map<string, number[]>()
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, times) => void data.set(key, times),
  }
}

describe('takeSlot', () => {
  it('allows up to the limit, then refuses with the wait time', async () => {
    const store = memoryStore()
    const start = 1_000_000
    for (let i = 0; i < 3; i++) {
      const decision = await takeSlot(store, 'ip', 3, start + i * 1000)
      assert.equal(decision.allowed, true)
      assert.equal(decision.remaining, 2 - i)
    }
    const refused = await takeSlot(store, 'ip', 3, start + 5000)
    assert.equal(refused.allowed, false)
    assert.equal(refused.remaining, 0)
    assert.equal(refused.resetSec, (WINDOW_MS - 5000) / 1000)
  })

  it('frees a slot once the oldest request leaves the window', async () => {
    const store = memoryStore()
    await takeSlot(store, 'ip', 2, 0)
    await takeSlot(store, 'ip', 2, 60_000)
    assert.equal((await takeSlot(store, 'ip', 2, WINDOW_MS - 1)).allowed, false)
    const later = await takeSlot(store, 'ip', 2, WINDOW_MS)
    assert.equal(later.allowed, true)
    assert.deepEqual(store.data.get('ip'), [60_000, WINDOW_MS])
  })

  it('counts each visitor separately', async () => {
    const store = memoryStore()
    await takeSlot(store, 'a', 1, 0)
    assert.equal((await takeSlot(store, 'a', 1, 1)).allowed, false)
    assert.equal((await takeSlot(store, 'b', 1, 1)).allowed, true)
  })

  it('does not record refused requests', async () => {
    const store = memoryStore()
    await takeSlot(store, 'ip', 1, 0)
    await takeSlot(store, 'ip', 1, 1000)
    assert.deepEqual(store.data.get('ip'), [0])
  })
})

describe('visitorKey', () => {
  const day = Date.UTC(2026, 9, 31, 12)

  it('never contains the IP', () => {
    assert.doesNotMatch(visitorKey('203.0.113.7', 'salt', day), /203/)
  })

  it('is stable within a day and changes the next day', () => {
    assert.equal(visitorKey('203.0.113.7', 'salt', day), visitorKey('203.0.113.7', 'salt', day + 3_600_000))
    assert.notEqual(visitorKey('203.0.113.7', 'salt', day), visitorKey('203.0.113.7', 'salt', day + 86_400_000))
  })
})
