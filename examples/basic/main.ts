import { Howl, staticFiles } from "@hushkey/howl";
import type { State } from "./howl.config.ts";
import { apis } from "./apis/_index.apis.ts";
import { middleware } from "./middleware/_index.middleware.ts";

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

app.configure(middleware);
app.configure(apis);

app.fsRoutes();

export default { app };
