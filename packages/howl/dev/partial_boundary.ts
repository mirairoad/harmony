import type { FsAdapter } from "../core/fs.ts";

/**
 * Detects which file in a layout/app chain places `<Partial>`. The result is
 * the **boundary**: everything at and above that index lives outside the
 * partial in the rendered DOM and must not be bundled into AOT chunks. Files
 * below the boundary sit inside the partial and need to be present in the
 * chunk so the AOT swap produces the same shape an SSR partial response would.
 */
export interface PartialBoundary {
  /** Absolute path of the file containing `<Partial>`. */
  filePath: string;
  /** Position of `filePath` within the supplied chain (0 = topmost). */
  index: number;
}

// JSX form: `<Partial>`, `<Partial />`, `<Partial\n...>` — opening tag.
// Call form: `h(Partial, ...)`, `jsx(Partial, ...)`, `createElement(Partial,
// ...)` — Partial passed as the component argument (opening paren or comma
// before, comma or closing paren after). Bracket-form import/export
// (`{ Partial }`) is intentionally excluded.
const PARTIAL_RE = /<Partial[\s/>]|[(,]\s*Partial\s*[,)]/;
const LINE_COMMENT_RE = /\/\/[^\n]*/g;
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;

/**
 * Cache scan results by file path + mtime. Layouts are visited once per AOT
 * page, so the same chain gets re-scanned for each page; caching keeps it to
 * one read per file per build.
 */
interface CacheEntry {
  mtime: number;
  hasPartial: boolean;
}
const cache = new Map<string, CacheEntry>();

/**
 * Returns `true` when the file's source contains a JSX `<Partial>` element or
 * an `h(Partial, ...)`-style call. Comments are stripped before scanning to
 * avoid false positives from commented-out usage. String-literal occurrences
 * are still a (low-risk) source of false positives — document the convention
 * to use the literal `Partial` identifier in app/layout files.
 */
export async function fileMentionsPartial(
  fs: FsAdapter,
  filePath: string,
): Promise<boolean> {
  let mtime = 0;
  try {
    const stat = await Deno.stat(filePath);
    mtime = stat.mtime?.getTime() ?? 0;
  } catch {
    // fall through — readTextFile will surface the error
  }

  const cached = cache.get(filePath);
  if (cached && cached.mtime === mtime) return cached.hasPartial;

  const src = await fs.readTextFile(filePath);
  const stripped = src
    .replace(BLOCK_COMMENT_RE, "")
    .replace(LINE_COMMENT_RE, "");
  const hasPartial = PARTIAL_RE.test(stripped);

  cache.set(filePath, { mtime, hasPartial });
  return hasPartial;
}

/**
 * Scans a chain of files (ordered root → leaf, optionally prefixed with the
 * `_app.tsx` path) and returns the topmost one that places `<Partial>`. The
 * caller uses this to decide which files in an AOT layout chain are above the
 * partial (and therefore already in the DOM) versus inside it (and therefore
 * need to be bundled into the AOT chunk).
 *
 * Returns `null` when no file in the chain places a Partial.
 */
export async function findPartialBoundary(
  fs: FsAdapter,
  chain: readonly string[],
): Promise<PartialBoundary | null> {
  for (let i = 0; i < chain.length; i++) {
    const filePath = chain[i];
    if (await fileMentionsPartial(fs, filePath)) {
      return { filePath, index: i };
    }
  }
  return null;
}

/** Clears the internal scan cache. Test-only. */
export function _clearPartialBoundaryCache(): void {
  cache.clear();
}
