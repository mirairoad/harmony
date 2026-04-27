import { expect } from "@std/expect";
import { z } from "zod";
import { defineConfig } from "../../api/define-api.ts";
import { apiHandler } from "../../api/api-handler.ts";
import { memoryCache } from "../../api/cache/memory.ts";
import errors from "../../api/errors.ts";
import { makeApp, json } from "../harness.ts";

interface State {
  userContext?: { id: string; roles: string[] };
}

type Role = "USER" | "ADMIN";

function setup(opts: Partial<Parameters<typeof defineConfig<State, Role>>[0]> = {}) {
  return defineConfig<State, Role>({
    roles: ["USER", "ADMIN"],
    cache: memoryCache(),
    rateLimitCache: memoryCache(),
    ...opts,
  });
}

Deno.test("api — public route returns wrapped { ok, data } payload", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const ping = defineApi({
    name: "Ping",
    directory: "public",
    method: "GET",
    roles: [],
    rateLimit: false,
    responses: { 200: z.object({ message: z.string() }) },
    handler: () => ({ statusCode: 200, message: "pong" }),
  });
  apiHandler(t.app, [ping], config);

  const res = await t.fetch("/api/public/ping");
  expect(res.status).toBe(200);
  expect(await json(res)).toEqual({ ok: true, data: { message: "pong" } });
});

Deno.test("api — protected route blocked when checkPermissionStrategy denies", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup({
    checkPermissionStrategy: (ctx, allowed) => {
      const user = ctx.state.userContext;
      if (!user) return ctx.json({ message: "Unauthorized" }, { status: 401 });
      if (!allowed.some((r) => user.roles.includes(r))) {
        return ctx.json({ message: "Forbidden" }, { status: 403 });
      }
    },
  });
  const adminOnly = defineApi({
    name: "Secret",
    directory: "admin",
    method: "GET",
    roles: ["ADMIN"],
    rateLimit: false,
    responses: { 200: z.object({ ok: z.boolean() }) },
    handler: () => ({ statusCode: 200, ok: true }),
  });
  apiHandler(t.app, [adminOnly], config);

  const anon = await t.fetch("/api/admin/secret");
  expect(anon.status).toBe(401);
});

Deno.test("api — Zod requestBody validation rejects malformed JSON", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const create = defineApi({
    name: "Create",
    directory: "items",
    method: "POST",
    roles: [],
    rateLimit: false,
    requestBody: z.object({ name: z.string().min(1) }),
    responses: { 200: z.object({ id: z.string() }) },
    handler: (ctx) => ({ statusCode: 200, id: `id-${ctx.req.body.name}` }),
  });
  apiHandler(t.app, [create], config);

  const ok = await t.fetch("/api/items/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "thing" }),
  });
  expect(ok.status).toBe(200);
  expect(await json(ok)).toEqual({ ok: true, data: { id: "id-thing" } });

  const bad = await t.fetch("/api/items/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "" }),
  });
  expect(bad.status).toBeGreaterThanOrEqual(400);
  expect(bad.status).toBeLessThan(500);
});

Deno.test("api — query schema parses values onto ctx.query()", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const search = defineApi({
    name: "Search",
    directory: "items",
    method: "GET",
    roles: [],
    rateLimit: false,
    query: z.object({
      q: z.string(),
      page: z.coerce.number().default(1),
    }),
    responses: { 200: z.object({ q: z.string(), page: z.number() }) },
    handler: (ctx) => {
      const q = ctx.query();
      return { statusCode: 200, q: q.q, page: q.page };
    },
  });
  apiHandler(t.app, [search], config);

  const res = await t.fetch("/api/items/search?q=howl&page=3");
  expect(await json(res)).toEqual({ ok: true, data: { q: "howl", page: 3 } });
});

Deno.test("api — rate limit returns 429 once max exceeded", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const limited = defineApi({
    name: "Limited",
    directory: "rate",
    method: "GET",
    roles: [],
    rateLimit: { max: 2, windowMs: 60_000 },
    responses: { 200: z.object({ ok: z.boolean() }) },
    handler: () => ({ statusCode: 200, ok: true }),
  });
  apiHandler(t.app, [limited], config);

  const a = await t.fetch("/api/rate/limited");
  const b = await t.fetch("/api/rate/limited");
  const c = await t.fetch("/api/rate/limited");

  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  expect(c.status).toBe(429);
  expect(c.headers.get("Retry-After")).not.toBeNull();
  expect(c.headers.get("X-RateLimit-Limit")).toBe("2");
});

Deno.test("api — caching short-circuits handler on second call", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  let runs = 0;
  const cached = defineApi({
    name: "Cached",
    directory: "items",
    method: "GET",
    roles: [],
    rateLimit: false,
    caching: { ttl: 60 },
    responses: { 200: z.object({ runs: z.number() }) },
    handler: () => {
      runs++;
      return { statusCode: 200, runs };
    },
  });
  apiHandler(t.app, [cached], config);

  const first = await t.fetch("/api/items/cached");
  const second = await t.fetch("/api/items/cached");

  expect(await json(first)).toEqual({ ok: true, data: { runs: 1 } });
  expect(await json(second)).toEqual({ ok: true, data: { runs: 1 } });
  expect(runs).toBe(1);
});

Deno.test("api — handler is responsible for redacting sensitive fields", async () => {
  // The framework no longer auto-redacts a "password" key — that masked
  // bypasses for "apiKey" / "token" / "pwd" / etc. and was security theatre.
  // Redaction is the handler's responsibility now.
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const create = defineApi({
    name: "Echo",
    directory: "auth",
    method: "POST",
    roles: [],
    rateLimit: false,
    responses: { 200: z.object({ user: z.string(), password: z.string() }) },
    handler: () => ({ statusCode: 200, user: "leo", password: "[redacted]" }),
  });
  apiHandler(t.app, [create], config);

  const res = await t.fetch("/api/auth/echo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await json<{ data: { password: string } }>(res);
  expect(body.data.password).toBe("[redacted]");
});

Deno.test("api — errors.notFound() yields 404 with structured body", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const handler = defineApi({
    name: "Boom",
    directory: "items",
    method: "GET",
    roles: [],
    rateLimit: false,
    responses: { 200: z.object({ ok: z.boolean() }) },
    handler: () => {
      throw errors.notFound("missing");
    },
  });
  apiHandler(t.app, [handler], config);

  const res = await t.fetch("/api/items/boom");
  expect(res.status).toBe(404);
});

Deno.test("api — explicit `path` overrides FS-derived path", async () => {
  const t = makeApp<State>();
  const { defineApi, config } = setup();
  const webhook = defineApi({
    name: "Stripe Webhook",
    directory: "webhooks",
    method: "POST",
    path: "/webhooks/stripe",
    roles: [],
    rateLimit: false,
    responses: { 200: z.object({ received: z.boolean() }) },
    handler: () => ({ statusCode: 200, received: true }),
  });
  apiHandler(t.app, [webhook], config);

  const ok = await t.fetch("/webhooks/stripe", { method: "POST" });
  expect(ok.status).toBe(200);

  const wrong = await t.fetch("/api/webhooks/stripe-webhook", { method: "POST" });
  expect(wrong.status).toBe(404);
});
