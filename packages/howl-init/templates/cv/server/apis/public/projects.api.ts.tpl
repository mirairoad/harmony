import { z } from "zod";
import { defineApi } from "../../../howl.config.ts";
import { readProjects } from "../../cv/reader.ts";

export default defineApi({
  name: "Projects",
  directory: "public",
  method: "GET",
  roles: [],
  caching: { ttl: 30 },
  responses: {
    200: z.object({
      items: z.array(
        z.object({
          slug: z.string(),
          title: z.string(),
          tagline: z.string(),
          description: z.string(),
          tags: z.array(z.string()),
          year: z.number(),
          url: z.string().optional(),
          repo: z.string().optional(),
          accent: z.string(),
          featured: z.boolean(),
          order: z.number(),
        }),
      ),
    }),
  },
  handler: () => ({ statusCode: 200, items: readProjects() }),
});
