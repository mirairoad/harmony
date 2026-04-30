import { z } from "zod";
import { defineApi } from "../../../howl.config.ts";

export default defineApi({
  name: "Pong",
  directory: "public",
  method: "POST",
  roles: [],
  rateLimit: { max: 30, windowMs: 60_000 },
  requestBody: z.object({
    message: z.string().min(1).max(280),
  }),
  responses: {
    200: z.object({
      ok: z.boolean(),
      echo: z.string(),
      receivedAt: z.string(),
    }),
  },
  handler: (ctx) => ({
    statusCode: 200,
    ok: true,
    echo: ctx.req.body.message,
    receivedAt: new Date().toISOString(),
  }),
});
