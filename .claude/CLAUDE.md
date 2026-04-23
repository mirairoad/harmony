# Howl Framework — Claude Agent Guide

## What this repo is

Howl is a Deno-native full-stack framework built on top of Fresh 2.x. It powers
[Hushkey](https://hushkey.app). Single JSR package: `@hushkey/howl`.

Root: `~/Private/typescript/howl/`\
Stack: Deno 2.x · Fresh 2.2 (vendored) · Preact 10 · Zod 4 · esbuild 0.25

---

## Package map

| Package             | Export path          | Responsibility                                           |
| ------------------- | -------------------- | -------------------------------------------------------- |
| `packages/core/`    | `"."`                | `Howl` class, `Context`, routing, segments, SSR, islands |
| `packages/api/`     | `"./api"`            | `defineApi`, `apiHandler`, cache adapters, OpenAPI       |
| `packages/dev/`     | `"./dev"`            | `HowlBuilder`, `Builder`, esbuild pipeline, CSS modules  |
| `packages/plugins/` | `"./plugins"`        | Tailwind v4 plugin                                       |
| `packages/cli/`     | `"./cli"`            | Minimal CLI                                              |
| `packages/utils/`   | internal             | `build-id.ts`                                            |
| `packages/tests/`   | internal             | Test fixtures and helpers                                |

Middleware export path: `"./middleware"` → `packages/core/middlewares/mod.ts`
API cache adapters: `"./api/cache"` → `packages/api/cache/mod.ts`

---

## File-system conventions (user project)

| Item         | Path pattern                          |
| ------------ | ------------------------------------- |
| Pages        | `pages/**/*.tsx`                      |
| Layouts      | `pages/_layout.tsx`                   |
| App wrapper  | `pages/_app.tsx`                      |
| Middleware   | `middleware/**/*.middleware.ts`        |
| Islands      | `islands/**/*.island.tsx`             |
| APIs         | `apis/**/*.api.ts`                    |
| Static       | `static/**/*`                         |
| Config       | `howl.config.ts`                      |
| Build output | `_howl/` (dev) · `dist/` (production) |

---

## Core request flow

```
HTTP Request
→ Global middlewares (app.use())
→ UrlPatternRouter.match()
→ Segment middleware stack (root→leaf, layouts stacked)
→ Route handler → PageResponse | Response
→ Page component rendered — single-pass renderToString (app + layouts + page)
→ ctx.cookies + ctx.headers merged into response
→ Link: preload headers added (JS modulepreload + CSS preload for islands)
→ HTML sent
```

API requests bypass the segment/layout stack — they go straight through
`preAsyncHandler` (validation) → `asyncHandler` (auth, rate limit, cache, execution).

---

## Key classes and their roles

### `Howl<State>` — `packages/core/app.ts`

The single app class. Builder-pattern methods return `this`.
`app.use()`, `.get/post/...()`, `.fsClientRoutes()`, `.fsApiRoutes()`, `.listen()`, `.handler()`.

Internal state (`#commands`) is a flat list of `Command<State>` objects; `applyCommands()`
in `commands.ts` resolves them into a router + segment tree at handler-creation time.

### `Context<State>` — `packages/core/context.ts`

One per request. Key properties: `url`, `req`, `params`, `state`, `headers` (response),
`cookies` (CookieManager), `isPartial`, `route`.

Response helpers: `ctx.json()`, `ctx.html()`, `ctx.text()`, `ctx.render()`, `ctx.redirect()`,
`ctx.partialRedirect()`, `ctx.stream()`, `ctx.sse()`.

All response helpers automatically merge `ctx.headers` so middleware-set headers/cookies propagate.

`ctx.render()` performs a **single-pass** `renderToString` covering the full tree (app wrapper +
layouts + page vnode). Previously two passes were used; the single-pass eliminates a redundant
render and saves ~5ms per request.

`ctx.render()` also appends `Link` preload headers — JS island chunks as `modulepreload`,
CSS island assets as `preload; as=style`. Browsers start fetching these assets as soon as
they receive the HTTP response headers, before parsing the HTML body.

### `ctx.sse()` — Server-Sent Events

```ts
return ctx.sse(async (send) => {
  send({ data: { hello: "world" }, event: "update", id: 1, retry: 3000 });
});
```

Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
`SSEEvent` interface: `{ data: unknown; event?: string; id?: string | number; retry?: number }`.
Exported from `@hushkey/howl` as `type SSEEvent`.

### `CookieManager` — `packages/core/cookies.ts`

`ctx.cookies.get/set/delete/all()`. Default set options: `httpOnly`, `sameSite: Strict`,
`path: /`. Uses `headers.append()` for `Set-Cookie`.

### `preAsyncHandler` — `packages/api/pre-async-handler.ts`

Validates path params, query params, and JSON body via Zod. Stores results via
`setApiRequestState(ctx, { body, query, rawBody })` — a WeakMap keyed on the context object
(`packages/api/_request_state.ts`). **Does not consume** `multipart/form-data` or
`application/x-www-form-urlencoded` body streams — handlers can call `ctx.req.formData()` safely.

### `asyncHandler` — `packages/api/async-handler.ts`

Auth (via `checkPermissionStrategy`), rate limiting, cache read/write, handler execution,
response formatting (`{ ok: true, data: {...} }`), password redaction.

Rate limit counters use `rateLimitCache` (separate from the response `cache`) so they can be
shared across instances via Redis/KV while response caching stays per-instance in memory.

---

## API definition pattern

```ts
// apis/public/ping.api.ts
import { defineApi } from "../../howl.config.ts";

export default defineApi({
  name: "Ping",
  directory: "public",        // used as OpenAPI tag; path inferred from FS
  method: "GET",
  roles: [],                  // empty = public
  responses: {
    200: z.object({ message: z.string() }),
  },
  // Per-route rate limit — overrides defaultRateLimit from config
  rateLimit: { max: 10, windowMs: 60_000 },
  // Sensitive endpoint — lock out for 1 hour after 5 failed attempts
  // rateLimit: { max: 5, windowMs: 60_000, blockDurationMs: 3_600_000 },
  // Disable rate limiting entirely for this route
  // rateLimit: false,
  handler: async (ctx, app) => ({ statusCode: 200, message: "pong" }),
});
```

Path inference: the FS location of the file is authoritative. `apis/public/ping.api.ts`
→ `/api/public/ping`. Use `[param]` folders for path params. Explicit `path` overrides FS.

---

## Rate limiting

Configured on `HowlApiConfig` (default) and per-route in `defineApi`:

```ts
// howl.config.ts
defineConfig({
  defaultRateLimit: { max: 100, windowMs: 60_000 },
  // Shared backend required for multi-instance deployments:
  rateLimitCache: redisCache(redis),   // rate limit counters — must be shared
  cache: memoryCache(),                // response cache — per-instance is fine
});
```

`RateLimitConfig`:
- `max` — max requests allowed in the window
- `windowMs` — counting window in milliseconds
- `blockDurationMs?` — lockout duration after hitting the limit (defaults to remaining window)

Rate limit keys are `ratelimit:{userId|ip}:{method}:{pathname}`. Authenticated requests use
`ctx.state.userContext.id`; unauthenticated requests fall back to IP from `x-forwarded-for`
/ `x-real-ip` / `remoteAddr`.

---

## Islands

- Files end in `.island.tsx`
- Skip SSR: `export const harmony = { ssr: false }`
- Client-only wrapper: `<ClientOnly>{() => <Component />}</ClientOnly>`
- Island CSS is automatically preloaded via `Link` response headers

---

## State and roles

`howl.config.ts` exports `State` interface, `roles` const, and `{ defineApi, config }` from
`defineConfig<State, Role>(...)`. Pass `config` to `app.fsApiRoutes(config)`.

---

## Commands system (`packages/core/commands.ts`)

Routes and middlewares are stored as `Command<State>` objects and applied lazily at
`app.handler()` call time. `applyCommandsInner()` walks the command list and builds
the router + segment tree. API routes use a special `ApiRouteCommand` that is populated
by `HowlBuilder` after API crawl.

---

## Cache adapters (`packages/api/cache/`)

| Adapter | Import | Notes |
|---------|--------|-------|
| `memoryCache()` | `@hushkey/howl/api/cache` | LRU in-memory, per-instance |
| `redisCache(redis)` | `@hushkey/howl/api/cache` | Redis-backed, shared across instances |
| `kvCache(kv)` | `@hushkey/howl/api/cache` | Deno KV — shared on Deploy, per-process locally |
| `tryCache(primary, fallback)` | `@hushkey/howl/api/cache` | Tiered with timeout fallback |

```ts
// Multi-instance setup
defineConfig({
  cache: tryCache(memoryCache(), redisCache(r)), // response cache
  rateLimitCache: redisCache(r),                 // rate limit — must be shared
});
```

---

## Built-in middlewares (`@hushkey/howl/middleware`)

| Middleware | Purpose |
|-----------|---------|
| `compression()` | Gzip/deflate for text, JSON, JS, SVG responses |
| `coalesceRequests()` | Deduplicates concurrent GETs to same URL (public routes only) |
| `staticFiles()` | Serves `static/` directory |
| `cors(options)` | CORS headers |
| `csrf(options)` | CSRF token validation |
| `csp(options)` | Content-Security-Policy |
| `trailingSlashes()` | Normalises trailing slash |

**Recommended order:**
```ts
app.use(coalesceRequests()); // thundering herd protection — first
app.use(compression());      // compress all responses
app.use(staticFiles());
app.fsClientRoutes();
```

`coalesceRequests()` only deduplicates GET requests with no `Cookie` or `Authorization` header.
Authenticated requests always get their own handler execution.

---

## Dev / build

```ts
const builder = new HowlBuilder(app, {
  root?: string,
  serverEntry?: string,       // e.g. "./server/main.ts" — apis/ is relative to this
  importApp: () => import("./main.ts").then(m => m.app),
  alias?: Record<string, string>,
  plugins?: EsbuildPlugin[],
});

await builder.listen({ port: 8000 }); // dev
await builder.build();                 // production
```

`HowlBuilder` injects CSS Modules and React→Preact aliases automatically.

---

## Error handling

```ts
throw new HttpError(404, "Not found");  // from packages/core/error.ts
throw new HttpError(401);
```

Caught by `DEFAULT_ERROR_HANDLER` in `app.ts` (plain text) or by `asyncHandler` for API
routes (JSON `{ error, service }`).

---

## Coding conventions

- **Deno / JSR idioms** — `import type`, `@std/*`, explicit `.ts` extensions.
- **No default exports on classes** — classes use named exports. API files use `export default defineApi(...)`.
- **No unnecessary comments** — code is self-documenting by naming; only add comments for non-obvious invariants or workarounds.
- **`deno-lint-ignore no-explicit-any`** — use sparingly and only where Deno's inference truly cannot help.
- **`// deno-lint-ignore-file`** at file top only when the whole file requires it (`async-handler.ts`).
- **Return `this` from builder methods** for chainability.
- **Private fields with `#`** — use Deno's private class fields, not `_` prefix.
- **Prefer `for...of` over `.forEach()`** for async loops.

---

## Known internal conventions

- API request state is stored in a **WeakMap** (`packages/api/_request_state.ts`), not on `ctx.state`.
  Use `getApiRequestState(ctx).body`, `.query`, `.rawBody` — never `(ctx.state as any).__body`.
- `ctx.state.__body` / `ctx.state.__query` / `ctx.state.__rawBody` — **old pattern, do not use**.
  The WeakMap approach keeps internal state off the user's `State` type entirely.

---

## What NOT to do

- Don't use `App` (deprecated alias) — use `Howl`.
- Don't call `app.handler()` multiple times — it rebuilds the router each time.
- Don't store mutable state on the `Howl` instance between requests — use `ctx.state`.
- Don't skip `ctx.partialRedirect()` for partial-aware middleware guards.
- Don't add auth middleware inline — use `checkPermissionStrategy` in `defineConfig`.
- Don't parse `ctx.req.body` in API handlers — use `ctx.req.body` which is already typed/parsed.
- Don't create new `Proxy` objects in hot paths unnecessarily.
- Don't use `memoryCache()` as `rateLimitCache` in multi-instance deployments — counters are per-process.
- Don't use `renderToStringAsync` expecting a speed improvement — it's a DX shift only. Data
  fetching parallelism is achieved with `Promise.all()` in the route handler.
- Don't pass islands large data sets as SSR props if the data isn't needed for the initial paint —
  use `export const harmony = { ssr: false }` and let the island fetch its own data on the client.

---

## Testing

Tests live next to the files they test (`*_test.ts`) or in `packages/tests/`.
Run: `deno test packages/` or specific file: `deno test packages/core/router_test.ts`.
`MockBuildCache` in `test_utils.ts` is the test double for `BuildCache`.

---

## Examples

- `examples/basic/` — minimal single-app setup
- `examples/fullstack/` — fullstack with separate server + client dirs, multi-client pattern
