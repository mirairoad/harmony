import { Howl } from "@hushkey/howl";
import type { State } from "../howl.config.ts";

export const middleware = (app: Howl<State>) => {
  app.use((ctx) => {
    console.log("middleware called from server!");
    return ctx.next();
  });
  app.use((ctx) => {
    // state is shared between servers and clients
    ctx.state.text = "middleware called by the client but set on the server!";
    return ctx.next();
  });
  app.use((ctx) => {
    ctx.headers.set("X-Request-Id", crypto.randomUUID());
    console.log("X-Request-Id", ctx.headers.get("X-Request-Id"));
    ctx.cookies.set("token", "1234567890", { httpOnly: true });
    ctx.cookies.set("token2", "1234567890", { httpOnly: true });
    ctx.cookies.set("token3", "1234567890", { httpOnly: true });
    ctx.cookies.delete("token3");
    console.log("token", ctx.cookies.get("token"));
    console.log("token2", ctx.cookies.get("token2"));
    console.log("token3", ctx.cookies.get("token3"));
    return ctx.next();
  });
};
