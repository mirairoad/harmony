// =============================================================================
// @hushkey/howl — Public API
// =============================================================================

// --- Framework entry point ---
export {
  getBuildCache,
  Howl,
  type HowlOptions,
  type ListenOptions,
  setBuildCache,
} from "./app.ts";

// --- Request context ---
export { Context, type SSEEvent } from "./context.ts";

// --- Page props ---
export type { PageProps } from "./render.ts";

// --- Cookies ---
export { CookieManager, type CookieOptions } from "./cookies.ts";

// --- Middleware ---
export { staticFiles } from "./middlewares/static_files.ts";
export { coalesceRequests } from "./middlewares/coalesce.ts";
export type { MaybeLazyMiddleware, Middleware } from "./middlewares/mod.ts";

// --- Client-only utility ---
export { ClientOnly } from "./client_only.tsx";

// --- Environment guards ---
export { IS_BROWSER, IS_SERVER } from "./guards.ts";

// --- Logger ---
export { HowlLogger, type LoggerOptions } from "./logger.ts";

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
export { fsAdapter } from "./fs.ts";
export { assertInDir, pathToExportName, pathToSpec, UniqueNamer } from "./utils.ts";
export { type BuildCache, IslandPreparer, ProdBuildCache } from "./build_cache.ts";
export { fsItemsToCommands, type FsRouteFile } from "./fs_routes.ts";
export { type Command, CommandType } from "./commands.ts";
export { type ServerIslandRegistry } from "./context.ts";
export type {
  ApiConfig,
  ClientConfig,
  WebSocketHandlers,
  WebSocketUpgradeOptions,
} from "./app.ts";
