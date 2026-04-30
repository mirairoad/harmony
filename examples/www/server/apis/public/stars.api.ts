import { defineApi } from "../../../howl.config.ts";
import { z } from "zod";

export default defineApi({
  name: "GithubStars",
  directory: "public",
  method: "GET",
  roles: [],
  rateLimit: { max: 60, windowMs: 60_000 },
  caching: {
    ttl: 21_600, // 6h
  },
  responses: {
    200: z.object({
      stars: z.number().nullable(),
    }),
  },
  handler: async () => {
    try {
      const token = Deno.env.get("GITHUB_TOKEN");
      const res = await fetch("https://api.github.com/repos/hushkey-app/howl", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return { statusCode: 200 as const, stars: null };
      const data = await res.json();
      return { statusCode: 200 as const, stars: data.stargazers_count ?? null };
    } catch {
      return { statusCode: 200 as const, stars: null };
    }
  },
});
