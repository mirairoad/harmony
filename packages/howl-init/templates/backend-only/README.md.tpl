# {{PROJECT_NAME}}

A backend-only [Howl](https://jsr.io/@hushkey/howl) project — no client, no
styling, no opinions. Two example endpoints to show the request/response shape.

## Setup

```sh
deno install
cp .env.example .env
deno task dev
```

The server binds to <http://127.0.0.1:8000> by default.

## Environment

| Variable        | Default     | Purpose                          |
| --------------- | ----------- | -------------------------------- |
| `DENO_PORT`     | `8000`      | Dev / start server port          |
| `DENO_HOSTNAME` | `127.0.0.1` | Dev / start server bind hostname |

## Endpoints

| Method | Path                | Notes                                       |
| ------ | ------------------- | ------------------------------------------- |
| `GET`  | `/api/public/ping`  | Health probe — responds with `pong`         |
| `POST` | `/api/public/pong`  | Echoes a JSON `{ message }` back to caller  |
| `GET`  | `/api/docs`         | OpenAPI spec (auto-generated)               |

```sh
curl http://127.0.0.1:8000/api/public/ping

curl -X POST http://127.0.0.1:8000/api/public/pong \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

## Adding endpoints

Drop a `*.api.ts` file under `server/apis/` — the path on disk becomes the URL.
For example, `server/apis/public/ping.api.ts` is served at `/api/public/ping`.

```ts
import { z } from "zod";
import { defineApi } from "../../../howl.config.ts";

export default defineApi({
  name: "Hello",
  directory: "public",
  method: "GET",
  roles: [],
  responses: { 200: z.object({ greeting: z.string() }) },
  handler: () => ({ statusCode: 200, greeting: "hi" }),
});
```

## Project layout

```
server/
  main.ts                # Howl app, middleware order
  apis/
    public/
      ping.api.ts        # GET  /api/public/ping
      pong.api.ts        # POST /api/public/pong
howl.config.ts           # State, roles, defineApi factory
dev.ts                   # HowlBuilder entry — dev server + production build
```

## Production

```sh
deno task build && deno task start          # plain Deno run
deno task build && deno task compile         # single-binary
```
