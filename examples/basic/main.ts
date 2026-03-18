import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "./howl.config.ts";

export const app = new Howl<State>({
  logger: true,
  debug: true,
});

app.use(staticFiles());

// console.info("info!");
// console.error("error!");
// console.warn("warn!");
// console.debug("debug!");
// console.log("log!");

app.use((ctx) => {
  ctx.state.text = "from the server!";
  return ctx.next();
});

app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
app.fsRoutes();

export default { fetch: app.handler() };
