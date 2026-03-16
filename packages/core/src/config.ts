import * as path from "@std/path";

export interface HarmonyConfig {
  basePath?: string;
  mode?: "development" | "production";
}

export interface ResolvedHarmonyConfig {
  root: string;
  basePath: string;
  mode: "development" | "production";
}

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