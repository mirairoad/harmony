# 🐺 Howl

> The full-stack Deno framework powering [Hushkey](https://hushkey.app)

Howl is a backend-first, Deno-native full-stack framework built on top of
[Fresh](https://fresh.deno.dev). It was created to power Hushkey — a multi-vertical platform for
foreigners living in Japan — and is open-sourced under MIT for others to use.

---

## Why Howl

Fresh is excellent. But building a production platform on top of it revealed gaps that required
workarounds:

- No native cookie API on `ctx`
- Response headers set in middleware didn't propagate to page renders
- No React ecosystem compatibility without Vite
- No first-class `mode` switching between API-only and full-stack
- No multi-client architecture for apps that need isolated frontend builds

Howl solves all of these natively.

---

## What Howl adds

**Native context extensions**

```typescript
// Cookies — first class, append semantics preserved
ctx.cookies.set("token", jwt, { httpOnly: true, sameSite: "Strict" });
ctx.cookies.get("token");
ctx.cookies.delete("session");

// Response headers — auto-merged into every response including page renders
ctx.headers.set("X-Request-Id", crypto.randomUUID());

// Query params
const search = ctx.query("q");
const all = ctx.query();
```

**React ecosystem compatibility**

```typescript
// React libraries work transparently — no config needed
import { toast, Toaster } from "sonner";
import { useQuery } from "@tanstack/react-query";
```

**Client-only islands**

```typescript
// Skip SSR entirely for hook-heavy React components
export const howl = { ssr: false };

export default function MyIsland() {
  // safe to use any React ecosystem library here
}
```

**Modular app configuration**

```typescript
export const app = new Howl<State>({ logger: true, debug: true });

app.configure(authMiddleware);
app.configure(rateLimiter);
app.configure((app) => {
  app.use(staticFiles());
  app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
});

app.fsRoutes();
```

**Built-in logger**

```typescript
const app = new Howl<State>({
  logger: true, // timestamp + PID on all console output
  debug: true, // enables console.debug
});
```

**Tailwind v4 and CSS Modules**

```typescript
// dev.ts
import { tailwindPlugin } from "@hushkey/howl/plugins";
tailwindPlugin(builder.getBuilder("default")!);
```

```tsx
// islands/Button.tsx
import styles from "./Button.module.css";
export default function Button() {
  return <button class={styles.button}>Click</button>;
}
```

---

## Installation

```bash
deno add jsr:@hushkey/howl
```

---

## Quick start

**`main.ts`**

```typescript
import { Howl, staticFiles } from "@hushkey/howl";

export interface State {
  user?: { id: string; email: string };
}

export const app = new Howl<State>({ logger: true });

app.use(staticFiles());

app.use((ctx) => {
  ctx.state.user = { id: "1", email: "hello@example.com" };
  return ctx.next();
});

app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
app.fsRoutes();

export default { fetch: app.handler() };
```

**`dev.ts`**

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
        <h1>Hello, {ctx.state.user?.email}</h1>
      </body>
    </html>
  );
}
```

---

## Packages

| Package                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `@hushkey/howl`         | Core runtime — routing, context, islands, SSR |
| `@hushkey/howl/dev`     | Build pipeline — esbuild, dev server, HMR     |
| `@hushkey/howl/plugins` | Official plugins — Tailwind v4, CSS Modules   |

---

## Conventions

| Convention         | Value         |
| ------------------ | ------------- |
| Pages directory    | `pages/`      |
| Islands directory  | `islands/`    |
| Static files       | `static/`     |
| Build output       | `dist/`       |
| Island file suffix | `.island.tsx` |

---

## Powered by Hushkey

Howl is the framework behind [Hushkey](https://hushkey.app) — a platform helping foreigners navigate
housing, jobs, and daily life in Japan.

The framework exists because Hushkey needed it. Every feature in Howl was built to solve a real
production problem.

---

## License

MIT — see [LICENSE](./LICENSE)

Built with 🐺 by [Leo Termine](https://github.com/leopiney) and the Hushkey team.
