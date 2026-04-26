import { expect } from "@std/expect";
import { cors } from "../../core/middlewares/cors.ts";
import { trailingSlashes } from "../../core/middlewares/trailing_slashes.ts";
import { csp } from "../../core/middlewares/csp.ts";
import { makeApp } from "../harness.ts";

Deno.test("cors — wildcard origin sets Access-Control-Allow-Origin", async () => {
  const t = makeApp();
  t.app.use(cors({ origin: "*" }));
  t.app.get("/", (ctx) => ctx.text("ok"));

  const res = await t.fetch("/");
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
});

Deno.test("cors — preflight OPTIONS responds with allow headers/methods", async () => {
  const t = makeApp();
  t.app.use(cors({
    origin: "https://app.example",
    allowMethods: ["GET", "POST"],
    allowHeaders: ["X-Token"],
    maxAge: 600,
  }));
  t.app.get("/r", (ctx) => ctx.text("ok"));

  const res = await t.fetch("/r", {
    method: "OPTIONS",
    headers: {
      "Origin": "https://app.example",
      "Access-Control-Request-Method": "POST",
    },
  });
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example");
  expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET,POST");
  expect(res.headers.get("Access-Control-Allow-Headers")).toBe("X-Token");
  expect(res.headers.get("Access-Control-Max-Age")).toBe("600");
});

Deno.test("cors — non-matching origin omits Allow-Origin header", async () => {
  const t = makeApp();
  t.app.use(cors({ origin: "https://allowed.example" }));
  t.app.get("/", (ctx) => ctx.text("ok"));

  const res = await t.fetch("/", {
    headers: { Origin: "https://evil.example" },
  });
  expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
});

Deno.test("trailingSlashes(always) — appends slash with redirect", async () => {
  const t = makeApp();
  t.app.use(trailingSlashes("always"));
  t.app.get("/about", (ctx) => ctx.text("about"));

  const res = await t.fetch("/about");
  expect(res.status).toBe(302);
  expect(res.headers.get("Location")).toBe("/about/");
});

Deno.test("trailingSlashes(never) — strips trailing slash with redirect", async () => {
  const t = makeApp();
  t.app.use(trailingSlashes("never"));
  t.app.get("/about", (ctx) => ctx.text("about"));

  const res = await t.fetch("/about/");
  expect(res.status).toBe(302);
  expect(res.headers.get("Location")).toBe("/about");
});

Deno.test("csp — sets Content-Security-Policy header", async () => {
  const t = makeApp();
  t.app.use(csp());
  t.app.get("/", (ctx) => ctx.text("ok"));

  const res = await t.fetch("/");
  const policy = res.headers.get("Content-Security-Policy");
  expect(policy).not.toBeNull();
});
