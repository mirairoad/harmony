import { Howl } from "@hushkey/howl";
import { coalesceRequests, compression } from "@hushkey/howl/middleware";
import { apiConfig, type State } from "../howl.config.ts";

export const app = new Howl<State>({
  logger: true,
  debug: true,
});

app.use(compression());
app.use(coalesceRequests());

app.fsApiRoutes(apiConfig);

export default { app };
