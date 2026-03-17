import { Harmony, staticFiles } from "@harmony/core";

export const app = new Harmony({ mode: "fullstack" });

app.use(staticFiles());
app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
app.fsRoutes();

export default { fetch: app.handler() };
