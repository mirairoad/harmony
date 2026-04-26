import { expect } from "@std/expect";
import { mergePath, pathToPattern, UrlPatternRouter } from "../../core/router.ts";

Deno.test("router — static pattern matches by exact pathname", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/about", ["about"]);

  const hit = r.match("GET", new URL("http://x/about"));
  expect(hit.handlers).toEqual(["about"]);
  expect(hit.methodMatch).toBe(true);
  expect(hit.pattern).toBe("/about");
});

Deno.test("router — dynamic pattern decodes URL-encoded params", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/users/:id", ["user"]);

  const hit = r.match("GET", new URL("http://x/users/foo%20bar"));
  expect(hit.params).toEqual({ id: "foo bar" });
});

Deno.test("router — method mismatch returns methodMatch=false but keeps pattern", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", ["g"]);

  const miss = r.match("POST", new URL("http://x/r"));
  expect(miss.pattern).toBe("/r");
  expect(miss.methodMatch).toBe(false);
  expect(miss.handlers).toEqual([]);
});

Deno.test("router — HEAD falls back to GET handlers when none registered", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", ["g"]);

  const hit = r.match("HEAD", new URL("http://x/r"));
  expect(hit.handlers).toEqual(["g"]);
  expect(hit.methodMatch).toBe(true);
});

Deno.test("router — unknown path leaves pattern null", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", ["g"]);

  const miss = r.match("GET", new URL("http://x/missing"));
  expect(miss.pattern).toBeNull();
  expect(miss.methodMatch).toBe(false);
});

Deno.test("router — getAllowedMethods returns every registered verb", () => {
  const r = new UrlPatternRouter<string>();
  r.add("GET", "/r", []);
  r.add("POST", "/r", []);
  r.add("DELETE", "/r", []);

  const allowed = r.getAllowedMethods("/r");
  expect(allowed.sort()).toEqual(["DELETE", "GET", "POST"]);
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

Deno.test("mergePath — basePath + path joins safely", () => {
  expect(mergePath("/api", "/users", false)).toBe("/api/users");
  expect(mergePath("/api", "/", false)).toBe("/api");
  expect(mergePath("", "/users", false)).toBe("/users");
});
