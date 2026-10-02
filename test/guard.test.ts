import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSlipGuard, MemoryStore, parseSlip, type Slip } from '../src/index.js'
import { bankSlipPayload } from './helpers/payloads.js'

function slip(transRef: string, bank = '004'): Slip {
  const r = parseSlip(bankSlipPayload(bank, transRef))
  if (!r.ok) throw new Error(r.message)
  return r.slip
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createSlipGuard', () => {
  it('blocks the second use of the same slip', async () => {
    const guard = createSlipGuard()
    expect(await guard.claim(slip('A1'))).toEqual({ ok: true, key: 'slip:bank:004:A1' })
    expect(await guard.claim(slip('A1'))).toEqual({
      ok: false,
      key: 'slip:bank:004:A1',
      reason: 'duplicate',
    })
    expect((await guard.claim(slip('A2'))).ok).toBe(true)
  })

  it('lets exactly one of many concurrent claims through', async () => {
    const guard = createSlipGuard()
    const s = slip('RACE')
    const results = await Promise.all(Array.from({ length: 50 }, () => guard.claim(s)))
    expect(results.filter((r) => r.ok)).toHaveLength(1)
  })

  it('can release a claim so the customer can retry', async () => {
    const guard = createSlipGuard()
    await guard.claim(slip('R1'))
    await guard.release(slip('R1'))
    expect((await guard.claim(slip('R1'))).ok).toBe(true)
  })

  it('forgets slips after the TTL and sweeps old entries', async () => {
    vi.useFakeTimers()
    const store = new MemoryStore()
    const guard = createSlipGuard({ store, ttlSeconds: 60 })
    await guard.claim(slip('T1'))
    vi.advanceTimersByTime(61_000)
    expect((await guard.claim(slip('T1'))).ok).toBe(true)

    vi.advanceTimersByTime(61_000)
    for (let i = 0; i < 1000; i++) await store.claim(`k${i}`, 1)
    expect(store.size).toBeLessThanOrEqual(1000)
  })

  it('uses the prefix for keys', async () => {
    const guard = createSlipGuard({ prefix: 'shop-a:' })
    expect((await guard.claim(slip('P1'))).key).toBe('shop-a:bank:004:P1')
  })
})
