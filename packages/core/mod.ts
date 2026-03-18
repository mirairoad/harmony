// =============================================================================
// @howl/core — Public API
// =============================================================================

// --- Framework entry point ---
export {
  type ApiConfig,
  type ClientConfig,
  Howl,
  type HowlMode,
  type HowlOptions,
} from "./howl.ts";

// --- App & routing ---
export { App, getBuildCache, type ListenOptions, setBuildCache } from "./app.ts";

// --- Request context ---
export { Context, type FreshContext } from "./context.ts";

// --- Middleware ---
export { staticFiles } from "./middlewares/static_files.ts";
export type { MaybeLazyMiddleware, Middleware } from "./middlewares/mod.ts";

// --- Client-only utility ---
export { ClientOnly } from "./client_only.tsx";

// --- HTTP errors ---
export { HttpError } from "./error.ts";

// --- Types ---
export type { LayoutConfig, Lazy, MaybeLazy, Route, RouteConfig } from "./types.ts";

// --- Config ---
export { type HowlConfig, parseDirPath, type ResolvedHowlConfig } from "./config.ts";

// --- Constants ---
export {
  ALIVE_URL,
  ASSET_CACHE_BUST_KEY,
  DAY,
  DEV_ERROR_OVERLAY_URL,
  HOUR,
  INTERNAL_PREFIX,
  MINUTE,
  PARTIAL_SEARCH_PARAM,
  SECOND,
  TEST_FILE_PATTERN,
  UPDATE_INTERVAL,
  WEEK,
} from "./constants.ts";

// --- Internals used by @howl/dev (not public API) ---
// These are exported for cross-package use but not part of the user-facing API
export { fsAdapter } from "./fs.ts";
export { assertInDir, pathToExportName, pathToSpec, UniqueNamer } from "./utils.ts";
export { type BuildCache, IslandPreparer } from "./build_cache.ts";
export { fsItemsToCommands, type FsRouteFile } from "./fs_routes.ts";
export { type Command, CommandType } from "./commands.ts";
export { type ServerIslandRegistry } from "./context.ts";

export { HowlBuilder } from "@hushkey/howl/dev";
