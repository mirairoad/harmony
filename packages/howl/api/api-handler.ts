import type { Howl } from "../core/app.ts";
import type { AnyApiDefinition, CacheAdapter, HowlApiConfig } from "./types.ts";
import { asyncHandler } from "./async-handler.ts";
import { preAsyncHandler } from "./pre-async-handler.ts";
import { memoryCache } from "./cache/memory.ts";
import { generateOpenApiSpec } from "./generate-openapi.ts";
import { setApiSpec } from "./api-specs.ts";
import { resolvePath } from "./resolve-path.ts";
import { type HandlerCommand, newHandlerCmd } from "../core/commands.ts";
import type { Method } from "../core/router.ts";

export { resolvePath };

type AppMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Register all API definitions on the Howl app.
 * Called internally by HowlBuilder when apis/ is crawled.
 *
 * The generated OpenAPI spec is stored in a module singleton accessible via
 * `getApiSpecs()` — expose it on whatever route you choose, with whatever
 * auth middleware you need.
 *
 * @example
 * import { getApiSpecs } from "@hushkey/howl/api";
 * app.get("/api/docs", requireRole("admin"), (ctx) => ctx.json(getApiSpecs()));
 */
function sortApis(apis: AnyApiDefinition[]): AnyApiDefinition[] {
  const scores = new Map<AnyApiDefinition, number>();
  for (const api of apis) {
    const resolved = resolvePath(api);
    const paths = Array.isArray(resolved) ? resolved : [resolved];
    scores.set(
      api,
      Math.min(
        ...paths.map((p) => {
          const paramCount = (p.match(/:[^/]+/g) ?? []).length;
          const literalCount = p.split("/").filter((s) => s && !s.startsWith(":")).length;
          return paramCount * 1000 - literalCount;
        }),
      ),
    );
  }
  return [...apis].sort((a, b) => scores.get(a)! - scores.get(b)!);
}

function buildHandlerCommands<State, Role extends string>(
  app: Howl<State>,
  sorted: AnyApiDefinition[],
  howlConfig: HowlApiConfig<State, Role> | null,
  cache: CacheAdapter,
  rateLimitCache: CacheAdapter,
): HandlerCommand<State>[] {
  const commands: HandlerCommand<State>[] = [];
  for (const api of sorted) {
    const resolved = resolvePath(api);
    const paths = Array.isArray(resolved) ? resolved : [resolved];
    for (const path of paths) {
      commands.push(
        newHandlerCmd(api.method as Method, path, [
          preAsyncHandler(api.params, api.requestBody, api.query),
          asyncHandler(app, api, howlConfig, cache, rateLimitCache),
        ], false),
      );
    }
  }
  return commands;
}

function finalizeApiRegistration(
  apis: AnyApiDefinition[],
  options: { title?: string; version?: string },
): void {
  setApiSpec(generateOpenApiSpec(apis, options));
  // deno-lint-ignore no-console
  console.debug(`[howl] ${apis.length} APIs registered`);
}

/**
 * Build handler commands for all APIs without registering them on the app.
 * Used by HowlBuilder to populate the ApiRouteCommand at its registered position,
 * preserving middleware ordering relative to app.fsApiRoutes().
 */
function resolveCaches(
  howlConfig: { cache?: CacheAdapter; rateLimitCache?: CacheAdapter } | null,
): { cache: CacheAdapter; rateLimitCache: CacheAdapter } {
  const cache = howlConfig?.cache ?? memoryCache();
  const rateLimitCache = howlConfig?.rateLimitCache ?? cache;
  return { cache, rateLimitCache };
}

/**
 * Build the {@linkcode HandlerCommand}s for `apis` without registering them
 * on the app. Used by `HowlBuilder` to splice API routes into the existing
 * command list at the position of `app.fsApiRoutes()` so middleware
 * ordering is preserved.
 */
export function buildApiCommands<State, Role extends string>(
  app: Howl<State>,
  apis: AnyApiDefinition[],
  howlConfig: HowlApiConfig<State, Role> | null = null,
  options: { title?: string; version?: string } = {},
): HandlerCommand<State>[] {
  const { cache, rateLimitCache } = resolveCaches(howlConfig);
  const commands = buildHandlerCommands(app, sortApis(apis), howlConfig, cache, rateLimitCache);
  finalizeApiRegistration(apis, options);
  return commands;
}

/**
 * Register `apis` directly on `app` by binding each definition to its
 * matching method/path on the {@linkcode Howl} instance.
 *
 * Use this for ad-hoc API registration. For file-system-driven loading via
 * `app.fsApiRoutes()`, the builder uses {@linkcode buildApiCommands} instead.
 */
export function apiHandler<State, Role extends string>(
  app: Howl<State>,
  apis: AnyApiDefinition[],
  howlConfig: HowlApiConfig<State, Role> | null = null,
  options: { title?: string; version?: string } = {},
): void {
  const { cache, rateLimitCache } = resolveCaches(howlConfig);
  for (const cmd of buildHandlerCommands(app, sortApis(apis), howlConfig, cache, rateLimitCache)) {
    app[cmd.method.toLowerCase() as AppMethod](cmd.pattern, ...cmd.fns);
  }
  finalizeApiRegistration(apis, options);
}
