import { Howl, staticFiles } from "@hushkey/howl";
import { coalesceRequests, compression } from "@hushkey/howl/middleware";
import { apiConfig, type State } from "./howl.config.ts";

export const app = new Howl<State>({
  logger: true,
});

app.use(coalesceRequests());
app.use(compression());
app.use(staticFiles());
app.fsApiRoutes(apiConfig);
app.fsClientRoutes();

export default { app };
