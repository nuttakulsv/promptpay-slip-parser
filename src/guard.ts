import { slipKey, type Slip } from './slip.js'

/**
 * Storage for claimed slips. `claim` must be atomic: when two requests claim the
 * same key at the same time, exactly one gets `true`.
 */
export interface SlipStore {
  claim(key: string, ttlSeconds: number): Promise<boolean>
  release(key: string): Promise<void>
}

/** In-process store. Fine for a single instance; use Redis or a database unique index otherwise. */
export class MemoryStore implements SlipStore {
  private readonly entries = new Map<string, number>()
  private claims = 0

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now()
    if (++this.claims % 1000 === 0) this.sweep(now)
    const expiresAt = this.entries.get(key)
    if (expiresAt !== undefined && expiresAt > now) return false
    this.entries.set(key, now + ttlSeconds * 1000)
    return true
  }

  async release(key: string): Promise<void> {
    this.entries.delete(key)
  }

  get size(): number {
    return this.entries.size
  }

  private sweep(now: number) {
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt <= now) this.entries.delete(key)
    }
  }
}

export interface SlipGuardOptions {
  store?: SlipStore
  /** How long a used slip stays blocked. Default: 30 days. */
  ttlSeconds?: number
  /** Prefix for store keys, handy when several shops share one Redis. */
  prefix?: string
}

export type ClaimResult =
  { ok: true; key: string } | { ok: false; key: string; reason: 'duplicate' }

export interface SlipGuard {
  /** Mark a slip as used. Returns `ok: false` if it was already used. */
  claim(slip: Slip): Promise<ClaimResult>
  /** Undo a claim, e.g. when the bank check failed for a reason that is not the customer's fault. */
  release(slip: Slip): Promise<void>
}

export function createSlipGuard({
  store = new MemoryStore(),
  ttlSeconds = 30 * 24 * 60 * 60,
  prefix = 'slip:',
}: SlipGuardOptions = {}): SlipGuard {
  return {
    async claim(slip) {
      const key = prefix + slipKey(slip)
      return (await store.claim(key, ttlSeconds))
        ? { ok: true, key }
        : { ok: false, key, reason: 'duplicate' }
    },
    async release(slip) {
      await store.release(prefix + slipKey(slip))
    },
  }
}
