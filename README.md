# 🐺 Howl

> The full-stack Deno framework powering [Hushkey](https://hushkey.app)

Howl is a backend-first, Deno-native full-stack framework built on top of [Fresh](https://fresh.deno.dev). It was created to power Hushkey — a multi-vertical platform for foreigners living in Japan — and is open-sourced under MIT for others to use.

---

## Why Howl

Fresh is excellent. But building a production platform on top of it revealed gaps that required workarounds:

- No native cookie API on `ctx`
- Response headers set in middleware didn't propagate to page renders
- No React ecosystem compatibility without Vite
- No first-class typed endpoint system with Zod validation
- No auto-generated OpenAPI spec
- No role-based access control built in

Howl solves all of these natively.

---

## Packages

| Import | Description |
|---|---|
| `@hushkey/howl` | Core runtime — routing, context, islands, SSR |
| `@hushkey/howl/dev` | Build pipeline — esbuild, HMR |
| `@hushkey/howl/plugins` | Official plugins — Tailwind v4, CSS Modules |
| `@hushkey/howl/api` | Endpoint contracts — defineApi, Zod validation, OpenAPI |

---

## Project structure

```
my-app/
├── client/
│   ├── pages/
│   │   ├── _app.tsx        ← root shell (html/head/body)
│   │   ├── _layout.tsx     ← shared UI layout (nav, sidebar, etc.)
│   │   └── index.tsx
│   └── islands/
│       └── counter.island.tsx
├── server/
│   ├── main.ts             ← app entrypoint
│   ├── middleware/
│   │   └── _index.middleware.ts
│   └── apis/
│       └── public/
│           └── ping.api.ts
├── static/
│   └── style.css
├── howl.config.ts          ← State type + defineApi factory
├── dev.ts                  ← dev/build entrypoint
└── deno.json
```

---

## Quick start

**`howl.config.ts`**
```typescript
import { defineConfig } from "@hushkey/howl/api";

export interface State {
  userContext?: UserContext;
}

export interface UserContext {
  user?: { id: string; roles: Role[] };
}

export const roles = ["user", "admin"] as const;
export type Role = typeof roles[number];

// defineConfig returns a pre-typed defineApi — import it in your .api.ts files
// so you don't need explicit <State, Role> type params everywhere.
export const { defineApi, config: apiConfig } = defineConfig<State, Role>({
  roles,
  checkPermissionStrategy: (ctx, allowedRoles) => {
    const user = ctx.state.userContext?.user;
    if (!user) return ctx.json({ message: "Unauthorized" }, { status: 401 });
    if (!allowedRoles.some((r) => user.roles.includes(r))) {
      return ctx.json({ message: "Forbidden" }, { status: 403 });
    }
    // return nothing = allow
  },
});
```

**`server/main.ts`**
```typescript
import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "../howl.config.ts";
import { apiConfig } from "../howl.config.ts";
import { middleware } from "./middleware/_index.middleware.ts";

export const app = new Howl<State>({ logger: true });

app.use(staticFiles());
app.configure(middleware);
app.fsApiRoutes(apiConfig); // crawls server/apis/, registers all .api.ts, exposes /api/docs
app.fsRoutes();             // crawls client/pages/, mounts all routes

export default { app };
```

**`dev.ts`**
```typescript
import { HowlBuilder } from "@hushkey/howl/dev";
import { tailwindPlugin } from "@hushkey/howl/plugins";
import { app } from "./server/main.ts";
import type { State } from "./howl.config.ts";

const builder = new HowlBuilder<State>(app, {
  root: import.meta.dirname ?? "",
  importApp: () => app,
  outDir: "dist",
  serverEntry: "./server/main.ts",
  clientEntry: "./client/pages/_app.ts",
});

tailwindPlugin(builder.getBuilder("default")!);

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen();
}
```

**`client/pages/_app.tsx`** — root HTML shell
```tsx
import type { RouteConfig } from "@hushkey/howl";
import type { FunctionComponent, JSX } from "preact";

export const config: RouteConfig = {};

export default function App({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <html>
      <head>
        <title>My App</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
```

**`client/pages/_layout.tsx`** — shared UI layout (nav, sidebar, etc.)
```tsx
import type { FunctionComponent, JSX } from "preact";

export default function ({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <>
      <div class="navbar bg-base-200">
        <div class="navbar-start">
          <a href="/" class="btn btn-ghost text-xl">🐺 Howl</a>
        </div>
        <div class="navbar-end">
          <a href="/" class="btn btn-ghost btn-sm">Home</a>
          <a href="/docs" class="btn btn-ghost btn-sm">Docs</a>
        </div>
      </div>
      <main>
        <Component />
      </main>
    </>
  );
}
```

> **Note:** `@hushkey/howl/runtime` must point to `shared.ts`, not `client/mod.ts`.
> `client/mod.ts` imports `partials.ts` which calls `document.addEventListener` at module level — it crashes server-side.
> `shared.ts` exports `Partial`, `IS_BROWSER`, `asset`, and `Head` safely for both server and client.

**`client/pages/index.tsx`**
```tsx
import type { Context } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";

export default function Index(ctx: Context<State>) {
  return <h1>Hello, {ctx.state.userContext?.user?.id}</h1>;
}
```

---

## Endpoint contracts

Each `.api.ts` file is a self-contained, typed endpoint contract: method, roles, Zod-validated query params / request body / responses, optional caching. No wiring needed — drop the file and it's live.

**`server/apis/public/ping.api.ts`**
```typescript
import { defineApi } from "../../../howl.config.ts"; // pre-typed, no <State, Role> needed
import { z } from "zod";

export default defineApi({
  name: "Ping",
  directory: "public",
  method: "GET",
  // path is optional — auto-generated as /api/public/ping
  roles: [],
  caching: { ttl: 5 },
  query: z.object({
    page: z.string().optional(),
    limit: z.string(),
  }),
  responses: {
    200: z.object({ ok: z.boolean(), message: z.string() }),
  },
  handler: (ctx) => {
    const { limit } = ctx.query();  // typed: { page?: string; limit: string }
    const page = ctx.query("page"); // typed: string | undefined
    return {
      statusCode: 200,
      ok: true,
      message: `pong 🐺 — page ${page ?? 1}, limit ${limit}`,
    };
  },
});
```

**`server/apis/private/users/get-me.api.ts`**
```typescript
import { defineApi } from "../../../../howl.config.ts";
import { z } from "zod";

export default defineApi({
  name: "Get Me",
  directory: "private/users",
  method: "GET",
  roles: ["user", "admin"], // typed — autocomplete works
  responses: {
    200: z.object({ data: z.any() }),
  },
  handler: async (ctx) => ({
    statusCode: 200,
    data: ctx.state.userContext, // ctx.state typed as State
  }),
});
```

**With typed request body:**
```typescript
import { defineApi } from "../../../howl.config.ts";
import { z } from "zod";

const body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default defineApi({
  name: "Sign In",
  directory: "authentication",
  method: "POST",
  roles: [],
  requestBody: body,
  responses: {
    200: z.object({ data: z.object({ token: z.string() }) }),
    401: z.object({ message: z.string() }),
  },
  handler: async (ctx) => {
    const { email, password } = ctx.req.body; // fully typed
    return { statusCode: 200, data: { token: "jwt..." } };
  },
});
```

OpenAPI spec is automatically exposed at `/api/docs` — query params, request body, path params, roles, and responses all appear in Scalar/Swagger UI.

---

## Context extensions
```typescript
// Cookies — first class, append semantics preserved
ctx.cookies.set("token", jwt, { httpOnly: true, sameSite: "Strict" });
ctx.cookies.get("token");
ctx.cookies.delete("session");

// Response headers — auto-merged into all responses including page renders
ctx.headers.set("X-Request-Id", crypto.randomUUID());

// Query params
const search = ctx.query("q");
const all = ctx.query();
```

---

## React ecosystem

React libs work transparently — no configuration needed:
```tsx
// client/islands/ToastIsland.tsx
import { toast, Toaster } from "sonner";
import { useState } from "preact/hooks";

export const howl = { ssr: false }; // skip SSR for hook-heavy components

export default function ToastIsland() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Toaster />
      <button onClick={() => { setCount(c => c + 1); toast.success(`${count + 1}`); }}>
        Click
      </button>
    </div>
  );
}
```

---

## Conventions

| Convention | Path |
|---|---|
| Root HTML shell | `client/pages/_app.tsx` |
| Shared UI layout | `client/pages/_layout.tsx` |
| Pages | `client/pages/` |
| Islands | `client/islands/` |
| Endpoint contracts | `server/apis/**/*.api.ts` |
| Middleware | `server/middleware/` |
| Static files | `static/` |
| Config | `howl.config.ts` |
| Build output | `dist/` |
| OpenAPI docs | `/api/docs` |
| Client runtime import | `@hushkey/howl/runtime` → `shared.ts` |

---

## Built-in logger
```typescript
const app = new Howl<State>({
  logger: true,  // timestamps + PID on all console output
  debug: true,   // enables console.debug
});
```

---

# Powered by Hushkey

Howl is the framework behind [Hushkey](https://hushkey.app) — a platform helping foreigners navigate housing, jobs, and daily life in Japan.

Every feature was built to solve a real production problem.

---

## License

MIT — see [LICENSE](./LICENSE)

Built with 🐺 by [Leo Termine](https://github.com/leopiney) and the Hushkey team.
