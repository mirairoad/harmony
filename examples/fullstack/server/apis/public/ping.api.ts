import { defineApi } from "../../../howl.config.ts";
import { z } from "zod";

export default defineApi({
  name: "Ping",
  directory: "public",
  method: "GET",
  roles: ["PUBLISHER"],
  caching: {
    ttl: 5,
  },
  //   requestBody: z.object({
  //     name: z.string(),
  //   }),
  responses: {
    200: z.object({
      ok: z.boolean(),
      message: z.string(),
    }),
  },
  handler: (_ctx) => {
    // await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 5000)));

    return {
      statusCode: 200,
      ok: true,
      message: `pong from howl 🐺 — ${new Date().toISOString()}`,
    };
  },
});
