import * as path from "@std/path";
import type { Command } from "./commands.ts";
import { fsItemsToCommands, type FsRouteFile } from "./fs_routes.ts";
import type { ServerIslandRegistry } from "./context.ts";
import type { AnyComponent } from "preact";
import { UniqueNamer } from "./utils.ts";
import { setBuildId } from "../utils/build-id.ts";

export interface FileSnapshot {
  name: string;
  filePath: string;
  hash: string | null;
  contentType: string;
}

export interface BuildSnapshot<State> {
  version: string;
  clientEntry: string;
  fsRoutes: FsRouteFile<State>[];
  /** API definitions — stored for production route registration */
  apiRoutes?: unknown[];
  staticFiles: Map<string, FileSnapshot>;
  islands: ServerIslandRegistry;
  entryAssets: string[];
}

export interface StaticFile {
  hash: string | null;
  size: number;
  contentType: string;
  readable: ReadableStream<Uint8Array> | Uint8Array;
  close(): void;
}

// deno-lint-ignore no-explicit-any
export interface BuildCache<State = any> {
  root: string;
  islandRegistry: ServerIslandRegistry;
  /** Registry of API definitions keyed by path — used for client generation */
  apiRegistry: Map<string, unknown>;
  clientEntry: string;
  features: {
    errorOverlay: boolean;
  };
  getFsRoutes(): Command<State>[];
  getApiRoutes(): unknown[];
  readFile(pathname: string): Promise<StaticFile | null>;
  getEntryAssets(): string[];
}

export class ProdBuildCache<State> implements BuildCache<State> {
  #snapshot: BuildSnapshot<State>;
  islandRegistry: ServerIslandRegistry;
  clientEntry: string;
  apiRegistry: Map<string, unknown> = new Map();
  features = { errorOverlay: false };

  constructor(public root: string, snapshot: BuildSnapshot<State>) {
    setBuildId(snapshot.version);
    this.#snapshot = snapshot;
    this.islandRegistry = snapshot.islands;
    this.clientEntry = snapshot.clientEntry;

    // Populate apiRegistry from snapshot
    for (const api of snapshot.apiRoutes ?? []) {
      // deno-lint-ignore no-explicit-any
      const a = api as any;
      const paths = Array.isArray(a.path) ? a.path : [a.path];
      for (const p of paths) {
        this.apiRegistry.set(`${a.method}:${p}`, api);
      }
    }
  }

  getEntryAssets(): string[] {
    return this.#snapshot.entryAssets;
  }

  getFsRoutes(): Command<State>[] {
    return fsItemsToCommands(this.#snapshot.fsRoutes);
  }

  getApiRoutes(): unknown[] {
    return this.#snapshot.apiRoutes ?? [];
  }

  async readFile(pathname: string): Promise<StaticFile | null> {
    const { staticFiles } = this.#snapshot;

    const info = staticFiles.get(pathname);
    if (info === undefined) return null;

    const filePath = path.isAbsolute(info.filePath)
      ? info.filePath
      : path.join(this.root, info.filePath);

    const [stat, file] = await Promise.all([
      Deno.stat(filePath),
      Deno.open(filePath),
    ]);

    return {
      hash: info.hash,
      contentType: info.contentType,
      size: stat.size,
      readable: file.readable,
      close: () => file.close(),
    };
  }
}

export class IslandPreparer {
  #namer = new UniqueNamer();

  prepare(
    registry: ServerIslandRegistry,
    mod: Record<string, unknown>,
    chunkName: string,
    modName: string,
    css: string[],
  ) {
    // Read the howl directive if exported
    const howlDirective = mod["howl"] as { ssr?: boolean } | undefined;
    // Also support legacy "harmony" directive
    const harmonyDirective = mod["harmony"] as { ssr?: boolean } | undefined;
    const directive = howlDirective ?? harmonyDirective;
    const ssr = directive?.ssr !== false; // default true

    for (const [name, value] of Object.entries(mod)) {
      if (typeof value !== "function") continue;

      const islandName = name === "default" ? modName : name;
      const uniqueName = this.#namer.getUniqueName(islandName);

      const fn = value as AnyComponent;
      registry.set(fn, {
        exportName: name,
        file: chunkName,
        fn,
        name: uniqueName,
        css,
        ssr,
      });
    }
  }
}
