import type { Howl } from "../core/app.ts";
import type { AnyApiDefinition, HowlApiConfig } from "./types.ts";
import { asyncHandler } from "./async-handler.ts";
import { preAsyncHandler } from "./pre-async-handler.ts";
import { memoryCache } from "./cache/memory.ts";
import { generateOpenApiSpec } from "./generate-openapi.ts";

type Method = "get" | "post" | "put" | "patch" | "delete";

/**
 * Convert a string to kebab-case.
 * "Find Nearby POIs" → "find-nearby-pois"
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve the path for an API definition.
 * If path is explicitly set, use it.
 * Otherwise auto-generate from directory + name in kebab-case.
 *
 * @example
 * // directory: "public/search", name: "Find Nearby POIs"
 * // → /api/public/search/find-nearby-pois
 *
 * // path: "/webhooks/stripe" → /webhooks/stripe (override)
 */
export function resolvePath(api: AnyApiDefinition): string | string[] {
  if (api.path) return api.path;
  const dir = api.directory.replace(/\\/g, "/");
  const name = toKebabCase(api.name);
  return `/api/${dir}/${name}`;
}

/**
 * Register all API definitions on the Howl app.
 * Called internally by HowlBuilder when apis/ is crawled.
 * Automatically exposes OpenAPI spec at /api/docs.
 */
export function apiHandler<State, Role extends string>(
  app: Howl<State>,
  apis: AnyApiDefinition[],
  // deno-lint-ignore no-explicit-any
  howlConfig: HowlApiConfig<State, Role> | null = null,
  options: {
    /** OpenAPI spec endpoint. Default: /api/docs */
    specPath?: string;
    title?: string;
    version?: string;
  } = {},
): void {
  const cache = howlConfig?.cache ?? memoryCache();
  const specPath = options.specPath ?? "/api/docs";

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
        preAsyncHandler(api.params, api.requestBody),
        asyncHandler(app, api, howlConfig, cache),
      );
    }
  }

  // Auto-expose OpenAPI spec
  const spec = generateOpenApiSpec(apis, {
    title: options.title,
    version: options.version,
  });

  app.get(specPath, (ctx) => ctx.json(spec));

  // deno-lint-ignore no-console
  console.info(`[howl] ${apis.length} APIs registered → docs at ${specPath}`);
}
