import { expect } from "@std/expect";
import {
  mergePath,
  pathToPattern,
  patternToSegments,
  UrlPatternRouter,
} from "../../core/router.ts";

Deno.test("router — static pattern matches by exact pathname", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/about", "about");

  const hit = r.match("GET", new URL("http://x/about"));
  expect(hit.item).toBe("about");
  expect(hit.methodMatch).toBe(true);
  expect(hit.pattern).toBe("/about");
});

Deno.test("router — dynamic pattern decodes URL-encoded params", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/users/:id", "user");

  const hit = r.match("GET", new URL("http://x/users/foo%20bar"));
  expect(hit.params).toEqual({ id: "foo bar" });
});

Deno.test("router — method mismatch returns methodMatch=false but keeps pattern", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", "g");

  const miss = r.match("POST", new URL("http://x/r"));
  expect(miss.pattern).toBe("/r");
  expect(miss.methodMatch).toBe(false);
  expect(miss.item).toBeNull();
});

Deno.test("router — HEAD falls back to GET handlers when none registered", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", "g");

  const hit = r.match("HEAD", new URL("http://x/r"));
  expect(hit.item).toBe("g");
  expect(hit.methodMatch).toBe(true);
});

Deno.test("router — unknown path leaves pattern null", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", "g");

  const miss = r.match("GET", new URL("http://x/missing"));
  expect(miss.pattern).toBeNull();
  expect(miss.methodMatch).toBe(false);
});

Deno.test("router — request with trailing slash matches route registered without one", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/wissen", "A");

  const hit = r.match("GET", new URL("http://x/wissen/"));
  expect(hit.item).toBe("A");
  expect(hit.methodMatch).toBe(true);
  // The matched pattern reflects the registered route, not the request URL.
  expect(hit.pattern).toBe("/wissen");
});

Deno.test("router — request without trailing slash matches route registered with one", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/wissen/", "A");

  const hit = r.match("GET", new URL("http://x/wissen"));
  expect(hit.item).toBe("A");
  expect(hit.methodMatch).toBe(true);
  expect(hit.pattern).toBe("/wissen/");
});

Deno.test("router — exact match wins over trailing-slash fallback", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/wissen", "A");
  r.add("GET", "/wissen/", "B");

  const withSlash = r.match("GET", new URL("http://x/wissen/"));
  expect(withSlash.item).toBe("B");
  expect(withSlash.pattern).toBe("/wissen/");

  const withoutSlash = r.match("GET", new URL("http://x/wissen"));
  expect(withoutSlash.item).toBe("A");
  expect(withoutSlash.pattern).toBe("/wissen");
});

Deno.test("router — root path doesn't fall back to alternate slash form", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/", "A");

  const hit = r.match("GET", new URL("http://x/"));
  expect(hit.item).toBe("A");
  expect(hit.pattern).toBe("/");
});

Deno.test("router — root-level optional [[param]] matches both / and /value", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", pathToPattern("[[id]]"), "root");

  const bare = r.match("GET", new URL("http://x/"));
  expect(bare.methodMatch).toBe(true);
  expect(bare.item).toBe("root");
  expect(bare.params.id).toBe("");

  const withParam = r.match("GET", new URL("http://x/abc"));
  expect(withParam.methodMatch).toBe(true);
  expect(withParam.item).toBe("root");
  expect(withParam.params).toEqual({ id: "abc" });
});

Deno.test("router — getAllowedMethods returns every registered verb", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", "g");
  r.add("POST", "/r", "p");
  r.add("DELETE", "/r", "d");

  const allowed = r.getAllowedMethods("/r");
  expect(allowed.sort()).toEqual(["DELETE", "GET", "POST"]);
});

Deno.test("router — first registered route wins on duplicate", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/foo", "first");
  r.add("GET", "/foo", "second");

  const hit = r.match("GET", new URL("http://x/foo"));
  expect(hit.item).toBe("first");
});

Deno.test("pathToPattern — index segment collapses to /", () => {
  expect(pathToPattern("index")).toBe("/");
  expect(pathToPattern("foo/index")).toBe("/foo");
});

Deno.test("pathToPattern — [param] becomes :param", () => {
  expect(pathToPattern("users/[id]")).toBe("/users/:id");
});

Deno.test("pathToPattern — [...rest] becomes :rest*", () => {
  expect(pathToPattern("files/[...path]")).toBe("/files/:path*");
});

Deno.test("pathToPattern — (group) segments are stripped", () => {
  expect(pathToPattern("foo/(group)/bar")).toBe("/foo/bar");
});

Deno.test("pathToPattern — [[param]] generates an optional segment", () => {
  // Mixed required + optional: required prefix is preserved.
  expect(pathToPattern("users/[[id]]")).toBe("/users{/:id}?");
});

Deno.test("pathToPattern — root-level [[param]] no longer 404s", () => {
  // Bare optional at root: would have produced "{/:id}?" (invalid pattern,
  // never matches). Fixed to "/{:id}?" so it matches "/" and "/value".
  expect(pathToPattern("[[id]]")).toBe("/{:id}?");
});

Deno.test("pathToPattern — (group)/[[param]]/(group2)/index resolves to /{:param}?", () => {
  // Groups are transparent, so a route consisting only of groups + an
  // optional param is equivalent to a bare [[param]] at root.
  expect(pathToPattern("(group)/[[name]]/(group2)/index")).toBe("/{:name}?");
});

Deno.test("patternToSegments — plain path splits into segments", () => {
  expect(patternToSegments("/api/users", "")).toEqual(["", "api"]);
  expect(patternToSegments("/api/users", "", true)).toEqual([
    "",
    "api",
    "users",
  ]);
});

Deno.test("patternToSegments — optional {/:param}? group is stripped before segmenting", () => {
  // Without the strip, `/api{/:opt}?/endpoint` would produce extra segments
  // like "api{" or "}?" and middleware registered at /api wouldn't match
  // routes with optional params under it. After the fix, it behaves
  // identically to `/api/endpoint`.
  expect(patternToSegments("/api{/:opt}?/endpoint", "")).toEqual(["", "api"]);
  expect(patternToSegments("/api{/:opt}?/endpoint", "", true)).toEqual([
    "",
    "api",
    "endpoint",
  ]);
});

Deno.test("patternToSegments — root-level optional pattern collapses cleanly", () => {
  // pathToPattern("[[name]]") → "/{:name}?" — segments should be just [root]
  // since stripping the optional group leaves the empty string.
  expect(patternToSegments("/{:name}?", "")).toEqual([""]);
});

Deno.test("mergePath — basePath + path joins safely", () => {
  expect(mergePath("/api", "/users", false)).toBe("/api/users");
  expect(mergePath("/api", "/", false)).toBe("/api");
  expect(mergePath("", "/users", false)).toBe("/users");
});
