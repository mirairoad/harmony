import type { CacheAdapter } from "../types.ts";

/**
 * Deno KV-backed cache adapter.
 * TTL is handled natively by Deno KV's `expireIn` option.
 *
 * @example
 * import { kvCache } from "@hushkey/howl/api";
 *
 * const kv = await Deno.openKv();
 * app.fsApiRoutes(defineConfig({ cache: kvCache(kv) }));
 *
 * // Tiered: memory L1 + KV L2
 * cache: tryCache(memoryCache(), kvCache(kv))
 */
export function kvCache(
  kv: Deno.Kv,
  options: { prefix?: Deno.KvKey } = {},
): CacheAdapter {
  const prefix: Deno.KvKey = options.prefix ?? ["howl", "cache"];

  return {
    async get(key: string): Promise<string | null> {
      const result = await kv.get<string>([...prefix, key]);
      return result.value ?? null;
    },

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
      await kv.set([...prefix, key], value, { expireIn: ttlSeconds * 1000 });
    },

    async delete(key: string): Promise<void> {
      await kv.delete([...prefix, key]);
    },

    async incr(key: string, ttlSeconds: number): Promise<number> {
      const k: Deno.KvKey = [...prefix, key];
      // CAS loop. KV's `set` resets TTL, so we store { count, expiresAt }
      // and pass `expireIn = remaining` on every write to preserve the
      // original window across increments.
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await kv.get<{ count: number; expiresAt: number }>(k);
        const now = Date.now();
        const next = existing.value && existing.value.expiresAt > now
          ? { count: existing.value.count + 1, expiresAt: existing.value.expiresAt }
          : { count: 1, expiresAt: now + ttlSeconds * 1000 };
        const result = await kv.atomic()
          .check({ key: k, versionstamp: existing.versionstamp })
          .set(k, next, { expireIn: Math.max(1, next.expiresAt - now) })
          .commit();
        if (result.ok) return next.count;
      }
      throw new Error("kvCache.incr: too many concurrent CAS retries");
    },
  };
}
