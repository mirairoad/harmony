import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "../howl.config.ts";
import { apiConfig } from "../howl.config.ts";
import { middleware } from "./middleware/_index.middleware.ts";

export const app = new Howl<State>({
  logger: true,
  debug: true,
});

app.use(staticFiles());
app.configure(middleware);
app.fsApiRoutes(apiConfig);
// app.fsServiceRoutes();
app.fsClientRoutes();

export default { app };
