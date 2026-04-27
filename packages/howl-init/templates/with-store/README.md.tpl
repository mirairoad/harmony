# {{PROJECT_NAME}}

A [Howl](https://jsr.io/@hushkey/howl) app with a Preact island wired to a
[`@preact/signals`](https://preactjs.com/guide/v10/signals/) store.

## Develop

```sh
deno task dev
```

Serves the app at <http://localhost:8000>.

## Build

```sh
deno task build
deno task start
```

## Layout

```
main.ts                          # Howl app, middleware order, route registration
howl.config.ts                   # State, roles, cache, defineApi factory
dev.ts                           # HowlBuilder entry — dev server + production build
pages/                           # File-system routed pages (.tsx)
islands/counter.island.tsx       # Interactive island; hydrates on the client
state/store.ts                   # Singleton signals — shared across islands
apis/                            # File-system routed APIs (.api.ts)
static/                          # Static assets served at `/`
```

## Store pattern

Signals live in `state/store.ts` as module-level constants. Islands import them
directly — no provider, no context. Updating a signal re-renders every island
that reads it.
