import type { CacheAdapter } from "../types.ts";

interface Entry {
  value: string;
  expiresAt: number;
}

/**
 * In-memory LRU cache adapter.
 * Zero dependencies. Default cache for all Howl apps.
 * Safe for development and low-traffic production.
 *
 * For high-traffic production swap for a Redis adapter.
 *
 * @example
 * import { memoryCache } from "@hushkey/howl/api";
 *
 * export default defineConfig({
 *   cache: memoryCache({ maxSize: 500 }),
 * });
 */
export function memoryCache(options: { maxSize?: number } = {}): CacheAdapter {
  const maxSize = options.maxSize ?? 500;
  const store = new Map<string, Entry>();

  function evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt < now) store.delete(key);
    }
  }

  function evictOldest(): void {
    const first = store.keys().next().value;
    if (first !== undefined) store.delete(first);
  }

  return {
    get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return Promise.resolve(null);
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        return Promise.resolve(null);
      }
      // LRU — move to end on access
      store.delete(key);
      store.set(key, entry);
      return Promise.resolve(entry.value);
    },

    set(key: string, value: string, ttlSeconds: number): Promise<void> {
      evictExpired();
      if (store.size >= maxSize) evictOldest();
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return Promise.resolve();
    },

    delete(key: string): Promise<void> {
      store.delete(key);
      return Promise.resolve();
    },

    incr(key: string, ttlSeconds: number): Promise<number> {
      evictExpired();
      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt >= now) {
        const next = (Number(existing.value) || 0) + 1;
        store.delete(key);
        store.set(key, { value: String(next), expiresAt: existing.expiresAt });
        return Promise.resolve(next);
      }
      if (store.size >= maxSize) evictOldest();
      store.set(key, { value: "1", expiresAt: now + ttlSeconds * 1000 });
      return Promise.resolve(1);
    },
  };
}
