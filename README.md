# 🐺 Howl

> The full-stack Deno framework powering [Hushkey](https://hushkey.app)

Howl is a backend-first, Deno-native full-stack framework built on top of [Fresh](https://fresh.deno.dev). It was created to power Hushkey — a multi-vertical platform for foreigners living in Japan — and is open-sourced under MIT for others to use.

---

## Why Howl

Fresh is excellent. But building a production platform on top of it revealed gaps that required workarounds:

- No native cookie API on `ctx`
- Response headers set in middleware didn't propagate to page renders
- No React ecosystem compatibility without Vite
- No first-class API contract system with Zod validation
- No auto-generated OpenAPI spec
- No role-based access control built in

Howl solves all of these natively.

---

## Packages

| Import | Description |
|---|---|
| `@hushkey/howl` | Core runtime — routing, context, islands, SSR |
| `@hushkey/howl/dev` | Build pipeline — esbuirver, HMR |
| `@hushkey/howl/plugins` | Official plugins — Tailwind v4, CSS Modules |
| `@hushkey/howl/api` | API layer — defineApi, Zod validation, OpenAPI |

---

## Quick start

**`howl.config.ts`**
```typescript
import { defineConfig } from "@hushkey/howl/api";

export interface State {
  userContext?: UserContext;
}

export interface UserContext {
  isAuthenticated: boolean;
  id: string;
  roles: Role[];
}

export const roles = ["user", "admin"] as const;
export type Role = typeof roles[number];

export default defineConfig<State, Role>({
  roles,
  getUser: async (ctx) => ctx.state.userContext ?? null,
});
```

**`main.ts`**
```typescript
import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "./howl.config.ts";

export const app = new Howl<State>({ logger: true });

app.use(staticFiles());
app.fsApiRoutes(); // crawls apis/, registers all .api.ts, exposes /api/docs
app.fsRoutes();    // crawls pages/, mounts all routes

export default { fetch: app.handler() };
```

**`dev.*
```typescript
import { HowlBuilder } from "@hushkey/howl/dev";
import { tailwindPlugin } from "@hushkey/howl/plugins";
import { app } from "./main.ts";

const builder = new HowlBuilder(app, {
  root: import.meta.dirname ?? "",
  importApp: () => Promise.resolve(app),
});

tailwindPlugin(builder.getBuilder("default")!);

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen();
}
```

**`pages/index.tsx`**
```tsx
import type { Context } from "@hushkey/howl";
import type { State } from "../main.ts";

export default function Index(ctx: Context<State>) {
  return (
    <html>
      <head>
        <title>My App</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <h1>Hello, {ctx.state.userContext?.id}</h1>
      </body>
    </html>
  );
}
```

---

## API Layer

**`apis/public/ping.api.ts`**
```typescript
import { defineApi } from "@hushkey/howl/api";
import { z } from "zod";

export default defineApi({
  name: "Ping",
  directory: "public",
  method: "GET",
  // path is optional — auto-generated as /api/public/ping
  roles: [],
  responses: {
    200: z.object({ ok: z.boolean(), message: z.string() }),
  },
  handler: () => ({
    statusCode: 200,
    ok: true,
    message: "pong 🐺",
  }),
});
```

**`apis/private/users/get-me.api.ts`**
```typescript
import { defineApi } from "@hushkey/howl/api";
import { z } from "zod";
import type { State, Role } from "../../howl.config.ts";

export default defineApi<State, Role>({
  name: "Get Me",
  directory: "private/users",
  method: "GET",
  roles: ["user", "admin"],  // typed from your Role union
  responses: {
    200: z.object({ data: z.any() }),
  },
  handler: async (ctx) => ({
    statusCode: 200,
    data: ctx.state.userContext,
  }),
});
```

**`apis/authentication/signin.api.ts`** — with typed request body:
```typescript
import { defineApi } from "@hushkey/howl/api";
import { z } from "zod";
import type { State, Role } from "../../howl.config.ts";

const body = z.object({
  em.string().email(),
  password: z.string().min(8),
});

export default defineApi<State, Role, typeof body>({
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

OpenAPI spec is automatically exposed at `/api/docs`.

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

React libes work transparently — no configuration needed:
```tsx
// islands/ToastIsland.tsx
import { toast, Toaster } from "sonner";
import { useState } from "preact/hooks";
import { ClientOnly } from "@hushkey/howl";

export const howl = { ssr: false }; // skip SSR for hook-heavy components

export default function ToastIsland() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <ClientOnly>{() => <Toaster />}</ClientOnly>
      <button onClick={() => { setCount(c => c + 1); toast.success(`${count + 1}`); }}>
        Click
      </button>
    </div>
  );
}
```

---

## Conventions

| Convention | Value |
|---|---|
| Pages | `pages/` |
| Islands | `islands/` |
| API definitions | `apis/**/*.api.ts` |
| Static files | `static/` |
| Config | `howl.config.ts` |
| Build output | `dist/` |
| OpenAPI docs | `/api/docs` |

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
