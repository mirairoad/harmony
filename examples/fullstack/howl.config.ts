import { defineConfig, memoryCache } from "@hushkey/howl/api";
// import { redisCache, tryCache } from "@hushkey/howl/api";

// import { Redis } from "ioredis";

// const redis = new Redis(Deno.env.get("REDIS_URL") ?? "redis://localhost:6379");

// redis.on("error", () => {
//   console.log("hello");
// });

type User = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
};

export interface UserContext {
  impersonatedUser?: User;
  user?: User;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface State {
  userContext?: UserContext;
  text: string;
}

export const roles = ["USER", "ADMIN", "SUPER_ADMIN", "SYSTEM", "PUBLISHER"] as const;
export type Role = typeof roles[number];

export const { defineApi, config: apiConfig } = defineConfig<State, Role>({
  roles,
  // cache: tryCache(redisCache(redis), memoryCache({ maxSize: 1000 })),
  cache: memoryCache({ maxSize: 1000 }),
  checkPermissionStrategy: (ctx, allowedRoles) => {
    // const user = ctx.state.userContext?.user;
    const user = { roles: ["PUBLISHER"] };
    if (!user) return ctx.json({ message: "Unauthorized" }, { status: 401 });
    if (!allowedRoles.some((r) => user.roles.includes(r))) {
      return ctx.json({ message: "Forbidden" }, { status: 405 });
    }
  },
});
