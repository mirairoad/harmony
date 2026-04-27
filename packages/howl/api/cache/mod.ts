/**
 * @module
 *
 * Cache-adapter entrypoint for `@hushkey/howl/api/cache`. Exports the
 * built-in {@linkcode CacheAdapter} implementations —
 * {@linkcode memoryCache}, {@linkcode redisCache}, {@linkcode kvCache},
 * and {@linkcode tryCache} — used both for API response caching and as
 * the rate-limit counter store. All four expose an atomic `incr(key,
 * ttl)` op that the rate limiter relies on for safe concurrent counting
 * on shared backends.
 */

export { memoryCache } from "./memory.ts";
export { redisCache, type RedisLike } from "./redis.ts";
export { tryCache } from "./tiered.ts";
export { kvCache } from "./kv.ts";
export type { CacheAdapter } from "../types.ts";
