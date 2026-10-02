// A SlipStore backed by Redis, for apps that run on more than one instance.
// Works with node-redis v4+ (`npm i redis`).
//
//   import { createClient } from 'redis'
//   import { createSlipGuard } from 'promptpay-slip-parser'
//   import { RedisSlipStore } from './redis-store.js'
//
//   const redis = await createClient({ url: process.env.REDIS_URL }).connect()
//   const guard = createSlipGuard({ store: new RedisSlipStore(redis) })

/** @implements {import('promptpay-slip-parser').SlipStore} */
export class RedisSlipStore {
  /** @param {import('redis').RedisClientType} client */
  constructor(client) {
    this.client = client
  }

  async claim(key, ttlSeconds) {
    // SET NX is atomic: only the first request gets "OK".
    return (await this.client.set(key, String(Date.now()), { NX: true, EX: ttlSeconds })) === 'OK'
  }

  async release(key) {
    await this.client.del(key)
  }
}

// ioredis has a different signature:
//   async claim(key, ttl) { return (await redis.set(key, '1', 'EX', ttl, 'NX')) === 'OK' }
