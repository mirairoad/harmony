import type { Howl } from "../core/app.ts";
import type { AnyApiDefinition, HowlApiConfig } from "./types.ts";
import { asyncHandler } from "./async-handler.ts";
import { preAsyncHandler } from "./pre-async-handler.ts";
import { memoryCache } from "./cache/memory.ts";
import { generateOpenApiSpec } from "./generate-openapi.ts";
import { setApiSpec } from "./api-specs.ts";
import { resolvePath } from "./resolve-path.ts";

export { resolvePath };

type Method = "get" | "post" | "put" | "patch" | "delete";

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
export function apiHandler<State, Role extends string>(
  app: Howl<State>,
  apis: AnyApiDefinition[],
  // deno-lint-ignore no-explicit-any
  howlConfig: HowlApiConfig<State, Role> | null = null,
  options: {
    title?: string;
    version?: string;
  } = {},
): void {
  const cache = howlConfig?.cache ?? memoryCache();

  // Sort by specificity — fewer params + more literals = register first
  // Prevents shadowing e.g. /api/v1/admin/:table/restore vs /:table/:id
  const sorted = [...apis].sort((a, b) => {
    const score = (api: AnyApiDefinition): number => {
      const resolved = resolvePath(api);
      const paths = Array.isArray(resolved) ? resolved : [resolved];
      return Math.min(
        ...paths.map((p) => {
          const paramCount = (p.match(/:[^/]+/g) ?? []).length;
          const literalCount = p.split("/").filter((s) => s && !s.startsWith(":")).length;
          return paramCount * 1000 - literalCount;
        }),
      );
    };
    return score(a) - score(b);
  });

  // Register each API
  for (const api of sorted) {
    const method = api.method.toLowerCase() as Method;
    const resolved = resolvePath(api);
    const paths = Array.isArray(resolved) ? resolved : [resolved];

    for (const path of paths) {
      app[method](
        path,
        preAsyncHandler(api.params, api.requestBody, api.query),
        asyncHandler(app, api, howlConfig, cache),
      );
    }
  }

  setApiSpec(generateOpenApiSpec(apis, {
    title: options.title,
    version: options.version,
  }));

  // deno-lint-ignore no-console
  console.info(`[howl] ${apis.length} APIs registered`);
}
