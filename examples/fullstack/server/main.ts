import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "../howl.config.ts";
import { apiConfig } from "../howl.config.ts";
import { middleware } from "./middleware/_index.middleware.ts";
import { coalesceRequests, compression } from "@hushkey/howl/middleware";

export const app = new Howl<State>({
  logger: true,
  debug: true,
});

app.use(staticFiles());
app.use(compression());
app.use(coalesceRequests());
app.configure(middleware);
app.fsApiRoutes(apiConfig);

app.use((ctx) => {
  console.log(ctx.url.pathname);
  return ctx.next();
});
// app.fsServiceRoutes();
app.fsClientRoutes();

export default { app };
