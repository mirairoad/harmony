import { z } from "zod";
import { defineApi } from "../../../howl.config.ts";
import { readProfile } from "../../cv/reader.ts";

export default defineApi({
  name: "Profile",
  directory: "public",
  method: "GET",
  roles: [],
  caching: { ttl: 30 },
  responses: {
    200: z.object({ profile: z.any() }),
  },
  handler: () => ({ statusCode: 200, profile: readProfile() }),
});
