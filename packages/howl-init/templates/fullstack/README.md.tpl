# {{PROJECT_NAME}}

A minimal fullstack [Howl](https://jsr.io/@hushkey/howl) starter — one API
route, one server-rendered page, one hydrated island built from a reusable
component, Tailwind v4 + daisyUI for styling.

## Setup

```sh
deno install
cp .env.example .env
deno task dev
```

Open <http://127.0.0.1:8000>.

## Environment

| Variable        | Default          | Purpose                          |
| --------------- | ---------------- | -------------------------------- |
| `APP_NAME`      | `{{PROJECT_NAME}}` | Brand title — shown in HTML <title> |
| `DENO_PORT`     | `8000`           | Dev / start server port          |
| `DENO_HOSTNAME` | `127.0.0.1`      | Dev / start server bind hostname |

## What's inside

| Path                                       | What it shows                                     |
| ------------------------------------------ | ------------------------------------------------- |
| `server/apis/public/ping.api.ts`           | A typed API route — `GET /api/public/ping`        |
| `server/main.ts`                           | Howl app, middleware, FS-based routing            |
| `client/pages/_app.tsx`                    | HTML shell + `<Partial>` for client-side nav      |
| `client/pages/index.tsx`                   | Server-rendered home page hosting the island      |
| `client/islands/Counter.island.tsx`        | The island Howl hydrates on the client            |
| `client/components/Counter.tsx`            | Reusable component using `@preact/signals`        |
| `static/style.css`                         | Tailwind entry + daisyUI plugin                   |
| `tailwind.config.ts`                       | Content globs + daisyUI plugin                    |

## Adding routes

Drop `*.tsx` under `client/pages/` (paths become URLs) or `*.api.ts` under
`server/apis/`. Islands go under `client/islands/` and must be named
`*.island.tsx` so Howl picks them up.

## Production

```sh
deno task build && deno task start          # plain Deno run
deno task build && deno task compile         # single-binary
```
