import type { ApiDefinition, HowlApiConfig, QuerySchema, RequestBodySchema, ResponsesMap } from "./types.ts";
import { memoryCache } from "./cache/memory.ts";

/**
 * Define your Howl API configuration and get back a pre-typed defineApi factory.
 * Export both from howl.config.ts so .api.ts files don't need explicit type params.
 *
 * @example
 * // howl.config.ts
 * import { defineConfig } from "@hushkey/howl/api";
 *
 * export interface State { userContext?: UserContext }
 * export const roles = ["USER", "ADMIN"] as const;
 * export type Role = typeof roles[number];
 *
 * export const { defineApi, config: apiConfig } = defineConfig<State, Role>({
 *   roles,
 *   checkPermissionStrategy: (ctx, allowedRoles) => {
 *     const user = ctx.state.userContext?.user;
 *     if (!user) return ctx.json({ message: "Unauthorized" }, 401);
 *     if (!allowedRoles.some(r => user.roles.includes(r))) {
 *       return ctx.json({ message: "Forbidden" }, 403);
 *     }
 *   },
 * });
 *
 * // apis/public/ping.api.ts
 * import { defineApi } from "../../howl.config.ts";
 * export default defineApi({ name: "Ping", roles: [], ... });
 * //                                        ^ Role[] autocomplete, no explicit type params
 */
export function defineConfig<
  State,
  Role extends string,
>(config: HowlApiConfig<State, Role>): {
  /**
   * Pre-typed defineApi with State and Role already bound.
   * Import this from howl.config.ts in your .api.ts files.
   */
  defineApi: <
    R extends ResponsesMap = ResponsesMap,
    B extends RequestBodySchema | null = null,
    Q extends QuerySchema | null = null,
  >(
    definition: ApiDefinition<State, Role, R, B, Q>,
  ) => ApiDefinition<State, Role, R, B, Q>;
  /** Pass to app.fsApiRoutes(apiConfig) */
  config: HowlApiConfig<State, Role>;
} {
  const resolvedConfig: HowlApiConfig<State, Role> = {
    cache: memoryCache(),
    ...config,
  };
  return {
    defineApi: (definition) => definition,
    config: resolvedConfig,
  };
}

/**
 * Define a typed API endpoint with explicit type params.
 * Prefer importing the bound defineApi from howl.config.ts instead.
 */
export function defineApi<
  State,
  Role extends string,
  R extends ResponsesMap = ResponsesMap,
  B extends RequestBodySchema | null = null,
  Q extends QuerySchema | null = null,
>(
  config: ApiDefinition<State, Role, R, B, Q>,
): ApiDefinition<State, Role, R, B, Q> {
  return config;
}
