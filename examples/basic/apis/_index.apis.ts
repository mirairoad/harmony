import { Howl } from "@hushkey/howl";

export const apis = (app: Howl) => {
  app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
  app.get("/api/pong", (ctx) => ctx.text("pong"));
  app.get("/api/echo", (ctx) => ctx.html("<h1>Hello, world!</h1>"));
  app.get("/api/echo/:name", (ctx) =>
    ctx.stream(() => {
      function* gen() {
        yield `<h1>Hello, ${ctx.params.name}!</h1>`;
      }
      return gen();
    }));
};
