import { z } from "zod";
import { defineApi } from "../../../howl.config.ts";
import { readProject } from "../../cv/reader.ts";

export default defineApi({
  name: "Project Item",
  directory: "public",
  path: "/api/public/projects/:slug",
  method: "GET",
  roles: [],
  caching: { ttl: 30 },
  params: z.object({ slug: z.string() }),
  responses: {
    200: z.object({ project: z.any() }),
    404: z.object({ error: z.string() }),
  },
  handler: (ctx) => {
    const { slug } = ctx.params;
    const project = readProject(slug);
    if (!project) return { statusCode: 404, error: "Not found" };
    return { statusCode: 200, project };
  },
});
