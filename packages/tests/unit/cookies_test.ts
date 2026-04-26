import { expect } from "@std/expect";
import { CookieManager } from "../../core/cookies.ts";

function makeManager(reqHeaders: Record<string, string> = {}) {
  const req = new Headers(reqHeaders);
  const res = new Headers();
  return { mgr: new CookieManager(req, res), res };
}

Deno.test("CookieManager.get — reads single cookie from request", () => {
  const { mgr } = makeManager({ Cookie: "token=abc; other=xyz" });
  expect(mgr.get("token")).toBe("abc");
  expect(mgr.get("other")).toBe("xyz");
  expect(mgr.get("missing")).toBeUndefined();
});

Deno.test("CookieManager.all — returns full cookie map", () => {
  const { mgr } = makeManager({ Cookie: "a=1; b=two; c=three" });
  expect(mgr.all()).toEqual({ a: "1", b: "two", c: "three" });
});

Deno.test("CookieManager.all — returns {} when no Cookie header", () => {
  const { mgr } = makeManager();
  expect(mgr.all()).toEqual({});
});

Deno.test("CookieManager.set — defaults: HttpOnly, SameSite=Strict, Path=/", () => {
  const { mgr, res } = makeManager();
  mgr.set("token", "abc");
  const set = res.get("Set-Cookie") ?? "";
  expect(set.startsWith("token=abc")).toBe(true);
  expect(set.includes("HttpOnly")).toBe(true);
  expect(set.includes("SameSite=Strict")).toBe(true);
  expect(set.includes("Path=/")).toBe(true);
});

Deno.test("CookieManager.set — appends multiple Set-Cookie entries", () => {
  const { mgr, res } = makeManager();
  mgr.set("a", "1");
  mgr.set("b", "2");
  // Headers.getSetCookie() returns an array
  const all = res.getSetCookie();
  expect(all.length).toBe(2);
  expect(all[0].startsWith("a=1")).toBe(true);
  expect(all[1].startsWith("b=2")).toBe(true);
});

Deno.test("CookieManager.set — secure auto-detected from x-forwarded-proto=https", () => {
  const { mgr, res } = makeManager({ "x-forwarded-proto": "https" });
  mgr.set("t", "v");
  expect(res.get("Set-Cookie")?.includes("Secure")).toBe(true);
});

Deno.test("CookieManager.set — explicit secure: false overrides auto-detect", () => {
  const { mgr, res } = makeManager({ "x-forwarded-proto": "https" });
  mgr.set("t", "v", { secure: false });
  expect(res.get("Set-Cookie")?.includes("Secure")).toBe(false);
});

Deno.test("CookieManager.delete — Max-Age=0 + Expires epoch", () => {
  const { mgr, res } = makeManager();
  mgr.delete("session");
  const set = res.get("Set-Cookie") ?? "";
  expect(set.includes("Max-Age=0")).toBe(true);
  expect(set.includes("Expires=Thu, 01 Jan 1970")).toBe(true);
});
