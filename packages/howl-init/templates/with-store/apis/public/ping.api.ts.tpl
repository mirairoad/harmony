import { z } from "zod";
import { defineApi } from "../../howl.config.ts";

export default defineApi({
  name: "Ping",
  directory: "public",
  method: "GET",
  roles: [],
  responses: {
    200: z.object({ message: z.string() }),
  },
  handler: () => ({ statusCode: 200, message: "pong" }),
});
