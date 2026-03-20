import type { CacheAdapter } from "../types.ts";

/**
 * Tries the primary cache first, falls back to secondary on miss.
 * Writes and deletes propagate to both.
 *
 * @param options.timeoutMs - Max ms to wait for the primary before falling back. Default: 300ms.
 *
 * @example
 * import { tryCache, memoryCache, redisCache } from "@hushkey/howl/api";
 *
 * cache: tryCache(memoryCache({ maxSize: 1000 }), redisCache(redis))
 * cache: tryCache(redisCache(redisSG), redisCache(redisUS), { timeoutMs: 150 })
 */
export function tryCache(
  primary: CacheAdapter,
  fallback: CacheAdapter,
  options: { timeoutMs?: number } = {},
): CacheAdapter {
  const timeoutMs = options.timeoutMs ?? 300;

  function warn(op: string, err: unknown): void {
    // deno-lint-ignore no-console
    console.warn(`[howl] tryCache: primary failed on ${op} —`, err);
  }

  function withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`primary timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  return {
    async get(key) {
      try {
        const value = await withTimeout(primary.get(key));
        if (value !== null) return value;
      } catch (err) {
        warn("get", err);
      }
      return fallback.get(key);
    },

    async set(key, value, ttl) {
      const results = await Promise.allSettled([
        withTimeout(primary.set(key, value, ttl)),
        fallback.set(key, value, ttl),
      ]);
      if (results[0].status === "rejected") warn("set", results[0].reason);
    },

    async delete(key) {
      const results = await Promise.allSettled([
        withTimeout(primary.delete(key)),
        fallback.delete(key),
      ]);
      if (results[0].status === "rejected") warn("delete", results[0].reason);
    },
  };
}
