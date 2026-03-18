import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "./howl.config.ts";

export const app = new Howl<State>({
  mode: "fullstack",
  logger: true,
  debug: true,
});

app.use(staticFiles());

app.use((ctx) => {
  ctx.state.text = "from the server!";
  return ctx.next();
});

app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
app.fsRoutes();

export default { fetch: app.handler() };
