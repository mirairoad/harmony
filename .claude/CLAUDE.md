# Howl Framework — Claude Agent Guide

## What this repo is

Howl is a Deno-native full-stack framework built on top of Fresh 2.x. It powers
[Hushkey](https://hushkey.app). Single JSR package: `@hushkey/howl`.

Root: `~/Private/typescript/howl/`\
Stack: Deno 2.x · Fresh 2.2 (vendored) · Preact 10 · Zod 4 · esbuild 0.25

---

## Package map

| Package             | Export path   | Responsibility                                           |
| ------------------- | ------------- | -------------------------------------------------------- |
| `packages/core/`    | `"."`         | `Howl` class, `Context`, routing, segments, SSR, islands |
| `packages/api/`     | `"./api"`     | `defineApi`, `apiHandler`, cache adapters, OpenAPI       |
| `packages/dev/`     | `"./dev"`     | `HowlBuilder`, `Builder`, esbuild pipeline, CSS modules  |
| `packages/plugins/` | `"./plugins"` | Tailwind v4 plugin                                       |
| `packages/cli/`     | `"./cli"`     | Minimal CLI                                              |
| `packages/utils/`   | internal      | `build-id.ts`                                            |
| `packages/tests/`   | internal      | Test fixtures and helpers                                |

---

## File-system conventions (user project)

| Item         | Path pattern                          |
| ------------ | ------------------------------------- |
| Pages        | `pages/**/*.tsx`                      |
| Layouts      | `pages/_layout.tsx`                   |
| App wrapper  | `pages/_app.tsx`                      |
| Middleware   | `middleware/**/*.middleware.ts`       |
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
→ Page component rendered (islands SSR'd unless ssr:false)
→ ctx.cookies + ctx.headers merged into response
→ HTML sent
```

API requests bypass the segment/layout stack — they go straight through `preAsyncHandler`
(validation) → `asyncHandler` (auth, cache, execution).

---

## Key classes and their roles

### `Howl<State>` — `packages/core/app.ts`

The single app class. Builder-pattern methods return `this`. `app.use()`, `.get/post/...()`,
`.fsClientRoutes()`, `.fsApiRoutes()`, `.listen()`, `.handler()`.

Internal state (`#commands`) is a flat list of `Command<State>` objects; `applyCommands()` in
`commands.ts` resolves them into a router + segment tree at handler-creation time.

### `Context<State>` — `packages/core/context.ts`

One per request. Key properties: `url`, `req`, `params`, `state`, `headers` (response), `cookies`
(CookieManager), `isPartial`, `route`. Response helpers: `ctx.json()`, `ctx.html()`, `ctx.text()`,
`ctx.render()`, `ctx.redirect()`, `ctx.partialRedirect()`, `ctx.stream()`.

All response helpers (except `ctx.stream()`) automatically merge `ctx.headers` so middleware-set
headers/cookies propagate.

### `CookieManager` — `packages/core/cookies.ts`

`ctx.cookies.get/set/delete/all()`. Default set options: `httpOnly`, `sameSite: Strict`, `path: /`.
Uses `headers.append()` for `Set-Cookie`.

### `preAsyncHandler` — `packages/api/pre-async-handler.ts`

Validates path params, query params, and JSON body via Zod. Stores results on `ctx.state.__body` /
`ctx.state.__query` (internal convention via `any` cast).

### `asyncHandler` — `packages/api/async-handler.ts`

Auth (via `checkPermissionStrategy`), cache read/write, handler execution, response formatting
(`{ ok: true, data: {...} }`), password redaction.

---

## API definition pattern

```ts
// apis/public/ping.api.ts
import { defineApi } from "../../howl.config.ts";

export default defineApi({
  name: "Ping",
  directory: "public", // used as OpenAPI tag; path inferred from FS
  method: "GET",
  roles: [], // empty = public
  responses: {
    200: z.object({ message: z.string() }),
  },
  handler: async (ctx, app) => ({ statusCode: 200, message: "pong" }),
});
```

Path inference: the FS location of the file is authoritative. `apis/public/ping.api.ts` →
`/api/public/ping`. Use `[param]` folders for path params. Explicit `path` overrides FS.

---

## Islands

- Files end in `.island.tsx`
- Skip SSR: `export const harmony = { ssr: false }`
- Client-only wrapper: `<ClientOnly>{() => <Component />}</ClientOnly>`

---

## State and roles

`howl.config.ts` exports `State` interface, `roles` const, and `{ defineApi, config }` from
`defineConfig<State, Role>(...)`. Pass `config` to `app.fsApiRoutes(config)`.

---

## Commands system (`packages/core/commands.ts`)

Routes and middlewares are stored as `Command<State>` objects and applied lazily at `app.handler()`
call time. `applyCommandsInner()` walks the command list and builds the router + segment tree. API
routes use a special `ApiRouteCommand` that is populated by `HowlBuilder` after API crawl.

---

## Cache adapters (`packages/api/cache/`)

- `memoryCache()` — LRU in-memory (default)
- `redisCache(redis)` — Redis-backed
- `tryCache(primary, fallback)` — tiered cache with timeout fallback

Inject via `defineConfig({ cache: tryCache(memoryCache(), redisCache(r)) })`.

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
throw new HttpError(404, "Not found"); // from packages/core/error.ts
throw new HttpError(401);
```

Caught by `DEFAULT_ERROR_HANDLER` in `app.ts` (plain text) or by `asyncHandler` for API routes (JSON
`{ error, service }`).

---

## Coding conventions

- **Deno / JSR idioms** — `import type`, `@std/*`, explicit `.ts` extensions.
- **No default exports on classes** — classes use named exports. API files use
  `export default defineApi(...)`.
- **No unnecessary comments** — code is self-documenting by naming; only add comments for
  non-obvious invariants or workarounds.
- **`deno-lint-ignore no-explicit-any`** — use sparingly and only where Deno's inference truly
  cannot help.
- **`// deno-lint-ignore-file`** at file top only when the whole file requires it
  (`async-handler.ts`).
- **Return `this` from builder methods** for chainability.
- **Private fields with `#`** — use Deno's private class fields, not `_` prefix.
- **Prefer `for...of` over `.forEach()`** for async loops.

---

## Known internal conventions

- `ctx.state.__body` — validated request body (set by `preAsyncHandler`, read by `asyncHandler` via
  Proxy)
- `ctx.state.__query` — validated query params (same flow)
- `ctx.state.__rawBody` — raw request body string (unconsumed JSON or non-JSON body)
- These are internal and not part of the public `State` type.

---

## What NOT to do

- Don't use `App` (deprecated alias) — use `Howl`.
- Don't call `app.handler()` multiple times — it rebuilds the router each time.
- Don't store mutable state on the `Howl` instance between requests — use `ctx.state`.
- Don't skip `ctx.partialRedirect()` for partial-aware middleware guards.
- Don't add auth middleware inline — use `checkPermissionStrategy` in `defineConfig`.
- Don't parse `ctx.req.body` in API handlers — use `ctx.req.body` which is already typed/parsed.
- Don't create new `Proxy` objects in hot paths unnecessarily.

---

## Testing

Tests live next to the files they test (`*_test.ts`) or in `packages/tests/`. Run:
`deno test packages/` or specific file: `deno test packages/core/router_test.ts`. `MockBuildCache`
in `test_utils.ts` is the test double for `BuildCache`.

---

## Examples

- `examples/basic/` — minimal single-app setup
- `examples/fullstack/` — fullstack with separate server + client dirs, multi-client pattern
