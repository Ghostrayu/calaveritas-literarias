import { createHash } from 'node:crypto'
import { getStore } from '@netlify/blobs'

export const WINDOW_MS = 10 * 60_000
export const DEFAULT_LIMIT = 10

export interface RateStore {
  get(key: string): Promise<number[] | null>
  set(key: string, times: number[]): Promise<void>
}

export interface RateDecision {
  allowed: boolean
  limit: number
  remaining: number
  resetSec: number
}

export async function takeSlot(store: RateStore, key: string, limit: number, now = Date.now()): Promise<RateDecision> {
  const recent = ((await store.get(key)) ?? []).filter((time) => now - time < WINDOW_MS)
  const allowed = recent.length < limit
  if (allowed) {
    recent.push(now)
    await store.set(key, recent)
  }
  const resetSec = recent.length > 0 ? Math.ceil((recent[0] + WINDOW_MS - now) / 1000) : 0
  return { allowed, limit, remaining: Math.max(0, limit - recent.length), resetSec }
}

export function visitorKey(ip: string, salt: string, now = Date.now()): string {
  const day = new Date(now).toISOString().slice(0, 10)
  return createHash('sha256').update(`${salt}|${day}|${ip}`).digest('hex')
}

export function blobStore(): RateStore {
  const store = getStore({ name: 'rate-limits', consistency: 'strong' })
  return {
    get: async (key) => {
      const value = await store.get(key, { type: 'json' })
      return Array.isArray(value) ? value.filter((time): time is number => typeof time === 'number') : null
    },
    set: async (key, times) => void (await store.setJSON(key, times)),
  }
}
