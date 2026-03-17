import { Harmony } from "@harmony/core";

export const app = new Harmony({ mode: "fullstack" });

app.getApp().get("/api/ping", (ctx) => ctx.json({ ok: true }));
app.getApp().fsRoutes();

export default { fetch: app.handler() };
