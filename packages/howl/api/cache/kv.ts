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
  };
}
