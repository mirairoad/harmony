import { walk, type WalkEntry, type WalkOptions } from "@std/fs/walk";

/**
 * Pluggable file-system adapter — exposed so tests and exotic runtimes can
 * substitute in-memory implementations.
 */
export interface FsAdapter {
  /** Returns the current working directory. */
  cwd(): string;
  /** Walks `root` and yields `WalkEntry` for every matching path. */
  walk(
    root: string | URL,
    options?: WalkOptions,
  ): AsyncIterableIterator<WalkEntry>;
  /** Returns `true` if `path` exists and is a directory. */
  isDirectory(path: string | URL): Promise<boolean>;
  /** Recursively create `dir` (no-op when it already exists). */
  mkdirp(dir: string): Promise<void>;
  /** Read the file at `path` as bytes. */
  readFile(path: string | URL): Promise<Uint8Array>;
  /** Read the file at `path` as UTF-8 text. */
  readTextFile(path: string | URL): Promise<string>;
}

/** Default {@linkcode FsAdapter} implementation backed by `Deno`. */
export const fsAdapter: FsAdapter = {
  walk,
  cwd: Deno.cwd,
  async isDirectory(path) {
    try {
      const stat = await Deno.stat(path);
      return stat.isDirectory;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
    }
  },
  async mkdirp(dir: string) {
    try {
      await Deno.mkdir(dir, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
  },
  readFile: Deno.readFile,
  readTextFile: Deno.readTextFile,
};
