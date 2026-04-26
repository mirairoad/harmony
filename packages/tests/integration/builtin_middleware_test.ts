import { expect } from "@std/expect";
import { cors } from "../../core/middlewares/cors.ts";
import { trailingSlashes } from "../../core/middlewares/trailing_slashes.ts";
import { csp } from "../../core/middlewares/csp.ts";
import { getNonce } from "../../core/context.ts";
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

Deno.test("csp — injects per-request nonce into script-src by default", async () => {
  const t = makeApp();
  let captured: string | undefined;
  t.app.use(csp());
  t.app.get("/", (ctx) => {
    captured = getNonce(ctx);
    return ctx.text("ok");
  });

  const res = await t.fetch("/");
  const policy = res.headers.get("Content-Security-Policy")!;

  // Nonce was stored on the context for the renderer to consume
  expect(captured).toBeDefined();
  expect(captured).toMatch(/^[a-f0-9]{32}$/);

  // CSP header references that exact nonce, not 'unsafe-inline'
  expect(policy).toContain(`script-src 'nonce-${captured}'`);
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
});

Deno.test("csp — generates a fresh nonce per request", async () => {
  const t = makeApp();
  const seen: string[] = [];
  t.app.use(csp());
  t.app.get("/", (ctx) => {
    seen.push(getNonce(ctx)!);
    return ctx.text("ok");
  });

  await t.fetch("/");
  await t.fetch("/");

  expect(seen.length).toBe(2);
  expect(seen[0]).not.toBe(seen[1]);
});

Deno.test("csp — nonce: false falls back to 'unsafe-inline'", async () => {
  const t = makeApp();
  let captured: string | undefined;
  t.app.use(csp({ nonce: false }));
  t.app.get("/", (ctx) => {
    captured = getNonce(ctx);
    return ctx.text("ok");
  });

  const res = await t.fetch("/");
  const policy = res.headers.get("Content-Security-Policy")!;

  expect(captured).toBeUndefined();
  expect(policy).toContain("script-src 'self' 'unsafe-inline'");
  expect(policy).not.toContain("nonce-");
});

Deno.test("csp — reportOnly switches header name", async () => {
  const t = makeApp();
  t.app.use(csp({ reportOnly: true, reportTo: "/csp-report" }));
  t.app.get("/", (ctx) => ctx.text("ok"));

  const res = await t.fetch("/");
  expect(res.headers.get("Content-Security-Policy")).toBeNull();
  expect(res.headers.get("Content-Security-Policy-Report-Only")).not.toBeNull();
  expect(res.headers.get("Reporting-Endpoints")).toBe(`csp-endpoint="/csp-report"`);
});
