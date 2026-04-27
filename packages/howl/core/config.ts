import * as path from "@std/path";

/**
 * User-supplied configuration accepted by the {@linkcode Howl} constructor.
 * Resolved into {@linkcode ResolvedHowlConfig} once the app is created.
 */
export interface HowlConfig {
  /** URL prefix prepended to every route (e.g. `/app`). Defaults to `""`. */
  basePath?: string;
  /** Run mode — toggles development-only behaviour (HMR, error overlay, etc.). */
  mode?: "development" | "production";
}

/**
 * Fully-resolved Howl configuration available on `app.config` at runtime.
 */
export interface ResolvedHowlConfig {
  /** Project root used to resolve file-system paths. */
  root: string;
  /** Resolved URL base path. */
  basePath: string;
  /** Resolved run mode. */
  mode: "development" | "production";
}

/**
 * Normalise a directory path: convert `file://` URLs to system paths,
 * resolve relative paths against `root`, and use forward slashes on Windows.
 */
export function parseDirPath(dirPath: string, root: string): string {
  if (dirPath.startsWith("file://")) {
    dirPath = path.fromFileUrl(dirPath);
  } else if (!path.isAbsolute(dirPath)) {
    dirPath = path.join(root, dirPath);
  }

  if (Deno.build.os === "windows") {
    dirPath = dirPath.replaceAll("\\", "/");
  }

  return dirPath;
}
