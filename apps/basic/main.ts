import { Harmony, staticFiles } from "@harmony/core";
import type { State } from "./harmony.config.ts";

export const app = new Harmony<State>({ mode: "fullstack" });

app.use(staticFiles());

app.use((ctx) => {
  ctx.state.text = "from the server!";
  return ctx.next();
});

app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
app.fsRoutes();

export default { fetch: app.handler() };
