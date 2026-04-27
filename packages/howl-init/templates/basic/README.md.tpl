# {{PROJECT_NAME}}

A minimal [Howl](https://jsr.io/@hushkey/howl) app.

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
main.ts             # Howl app, middleware order, route registration
howl.config.ts      # State, roles, cache, defineApi factory
dev.ts              # HowlBuilder entry — dev server + production build
pages/              # File-system routed pages (.tsx)
apis/               # File-system routed APIs (.api.ts)
static/             # Static assets served at `/`
```
