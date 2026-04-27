import { expect } from "@std/expect";
import { memoryCache } from "../../api/cache/memory.ts";
import { tryCache } from "../../api/cache/tiered.ts";
import type { CacheAdapter } from "../../api/types.ts";

Deno.test("memoryCache — round-trip set/get", async () => {
  const c = memoryCache();
  await c.set("k", "v", 60);
  expect(await c.get("k")).toBe("v");
});

Deno.test("memoryCache — get returns null for missing key", async () => {
  const c = memoryCache();
  expect(await c.get("missing")).toBeNull();
});

Deno.test("memoryCache — TTL expiry returns null after window passes", async () => {
  const c = memoryCache();
  await c.set("k", "v", 0);
  await new Promise((r) => setTimeout(r, 5));
  expect(await c.get("k")).toBeNull();
});

Deno.test("memoryCache — delete removes the entry", async () => {
  const c = memoryCache();
  await c.set("k", "v", 60);
  await c.delete("k");
  expect(await c.get("k")).toBeNull();
});

Deno.test("memoryCache — LRU evicts oldest beyond maxSize", async () => {
  const c = memoryCache({ maxSize: 2 });
  await c.set("a", "1", 60);
  await c.set("b", "2", 60);
  await c.set("c", "3", 60);
  // "a" should be evicted
  expect(await c.get("a")).toBeNull();
  expect(await c.get("b")).toBe("2");
  expect(await c.get("c")).toBe("3");
});

Deno.test("tryCache — reads from primary, falls back to secondary on miss", async () => {
  const primary = memoryCache();
  const secondary = memoryCache();
  await secondary.set("k", "from-secondary", 60);

  const tiered = tryCache(primary, secondary);
  expect(await tiered.get("k")).toBe("from-secondary");
});

Deno.test("tryCache — set writes to both layers", async () => {
  const primary = memoryCache();
  const secondary = memoryCache();
  const tiered = tryCache(primary, secondary);

  await tiered.set("k", "v", 60);
  expect(await primary.get("k")).toBe("v");
  expect(await secondary.get("k")).toBe("v");
});

Deno.test("tryCache — falls back when primary throws", async () => {
  const broken: CacheAdapter = {
    get: () => Promise.reject(new Error("boom")),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
  const fallback = memoryCache();
  await fallback.set("k", "alive", 60);

  const tiered = tryCache(broken, fallback);
  expect(await tiered.get("k")).toBe("alive");
});

Deno.test("tryCache — falls back to secondary when primary times out", async () => {
  const timers: number[] = [];
  const slow: CacheAdapter = {
    get: () =>
      new Promise((r) => {
        timers.push(setTimeout(() => r("never"), 1000));
      }),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
  const fallback = memoryCache();
  await fallback.set("k", "fast", 60);

  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const tiered = tryCache(slow, fallback, { timeoutMs: 10 });
    expect(await tiered.get("k")).toBe("fast");
  } finally {
    console.warn = originalWarn;
    for (const t of timers) clearTimeout(t);
  }
});
