import type { CacheAdapter } from "../types.ts";

/** Minimal interface satisfied by ioredis, node-redis, and Upstash. */
interface RedisLike {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  // EventEmitter — present on ioredis clients
  on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
}

/**
 * Redis cache adapter. Pass any ioredis-compatible client.
 *
 * @example
 * import Redis from "ioredis";
 * import { redisCache } from "@hushkey/howl/api";
 *
 * const redis = new Redis(Deno.env.get("REDIS_URL"));
 * export const { defineApi, config } = defineConfig({ cache: redisCache(redis) });
 */
export function redisCache(client: RedisLike): CacheAdapter {
  // Prevent ioredis connection errors from becoming unhandled EventEmitter throws.
  // tryCache catches errors at the operation level, but reconnection events fire
  // outside any promise chain and crash if no listener is attached.
  client.on?.("error", (err) => {
    // deno-lint-ignore no-console
    console.warn(
      "[howl] redisCache: connection error (operations will fall back if tryCache is used) —",
      err,
    );
  });

  return {
    get: (key) => client.get(key),
    set: (key, value, ttl) => client.setex(key, ttl, value).then(() => {}),
    delete: (key) => client.del(key).then(() => {}),
  };
}
