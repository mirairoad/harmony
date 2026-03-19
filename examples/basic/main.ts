import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "./howl.config.ts";
import { middleware } from "./middleware/_index.middleware.ts";
// import { config } from "./howl.config.ts";

export const app = new Howl<State>({
  logger: true,
  debug: true,
  // config,
});

app.use(staticFiles());

app.configure(middleware);

// console.info("info!");
// console.error("error!");
// console.warn("warn!");
// console.debug("debug!");
// console.log("log!");

app.fsApiRoutes();
app.fsRoutes();

export default { app };
