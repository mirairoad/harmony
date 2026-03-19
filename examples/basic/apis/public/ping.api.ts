import { defineApi } from "@hushkey/howl/api";
import { z } from "zod";

export default defineApi({
  name: "Ping",
  directory: "public",
  method: "GET",
  roles: ["SUPER_ADMIN"],
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
  handler: async (_ctx) => {
    await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 5000)));

    return {
      statusCode: 200,
      ok: true,
      message: `pong from howl 🐺 — ${new Date().toISOString()}`,
    };
  },
});
