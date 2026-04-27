import type { AnyApiDefinition } from "./types.ts";

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
