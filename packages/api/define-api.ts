import type { ApiDefinition, HowlApiConfig, RequestBodySchema, ResponsesMap } from "./types.ts";
import { memoryCache } from "./cache/memory.ts";

/**
 * Define your Howl API configuration.
 * Place the default export in howl.config.ts at your project root.
 *
 * @example
 * // howl.config.ts
 * import { defineConfig } from "@hushkey/howl/api";
 *
 * export interface State { userContext?: UserContext }
 * export const roles = ["user", "admin"] as const;
 * export type Role = typeof roles[number];
 *
 * export default defineConfig<State, Role>({
 *   roles,
 *   getUser: async (ctx) => ctx.state.userContext ?? null,
 * });
 */
export function defineConfig<
  State,
  Role extends string,
>(config: HowlApiConfig<State, Role>): HowlApiConfig<State, Role> {
  return {
    cache: memoryCache(),
    ...config,
  };
}

/**
 * Define a typed API endpoint.
 * Place in apis/**\/*.api.ts — auto-discovered by HowlBuilder.
 *
 * @example
 * export default defineApi<State, Role>({
 *   name: "Get Me",
 *   directory: "private/users",
 *   method: "GET",
 *   path: "/api/v1/private/users/me",
 *   roles: ["user"],
 *   responses: {
 *     200: z.object({ data: z.any() }),
 *   },
 *   handler: async (ctx) => ({
 *     statusCode: 200,
 *     data: ctx.state.userContext,
 *   }),
 * });
 */
export function defineApi<
  State,
  Role extends string,
  R extends ResponsesMap = ResponsesMap,
  B extends RequestBodySchema | null = null,
>(
  config: ApiDefinition<State, Role, R, B>,
): ApiDefinition<State, Role, R, B> {
  return config;
}
