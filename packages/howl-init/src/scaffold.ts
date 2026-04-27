import { dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Default URL pointing at the shipped template folders.
 *
 * Resolves to a `file://` URL during local development and to a `https://` JSR
 * URL when the package runs from the registry. Always ends with a trailing
 * slash so it can be used as a base for `new URL(rel, root)`.
 */
export const DEFAULT_TEMPLATES_ROOT: string = new URL("../templates/", import.meta.url).href;

/** Token replaced inside `.tpl` files with the project name. */
export const PROJECT_NAME_TOKEN = "{{PROJECT_NAME}}";

/** Progress callback invoked after each file is written. */
export interface ScaffoldProgress {
  /** Index of the file just written, starting at 1. */
  current: number;
  /** Total number of files in the template. */
  total: number;
  /** Template-relative path of the file just written. */
  file: string;
}

/** Inputs to {@link scaffold}. */
export interface ScaffoldOptions {
  /** Template id — must match a key in the manifest under `templatesRoot`. */
  templateId: string;
  /** Absolute path of the new project directory. Created if missing; must be empty if it exists. */
  targetDir: string;
  /** Project name written into `deno.json` and any other token sites. */
  projectName: string;
  /**
   * Override the templates root (used in tests). Accepts a URL string (with
   * scheme) or an absolute filesystem path. Defaults to {@link DEFAULT_TEMPLATES_ROOT}.
   */
  templatesRoot?: string;
  /** Optional progress callback. Fires once per file as it is written. */
  onProgress?: (progress: ScaffoldProgress) => void;
}

/** Mapping of template id to relative file paths inside the template folder. */
export interface TemplateManifest {
  /** Sorted list of template-relative file paths for the given template id. */
  [templateId: string]: string[];
}

/**
 * Copies a template folder into `targetDir`.
 *
 * File rules:
 * - Files ending in `.tpl` have the suffix stripped and `{{PROJECT_NAME}}` tokens replaced.
 * - A file named exactly `gitignore` is renamed to `.gitignore` (dotfiles inside `templates/`
 *   would otherwise be filtered by some packaging tools).
 * - A file named exactly `env.example` is renamed to `.env.example`.
 * - All other files are copied byte-for-byte.
 */
export async function scaffold(opts: ScaffoldOptions): Promise<void> {
  const root = normaliseRoot(opts.templatesRoot ?? DEFAULT_TEMPLATES_ROOT);
  const manifest = await loadManifest(root);
  const files = manifest[opts.templateId];
  if (!files || files.length === 0) {
    throw new Error(`Template not found: ${opts.templateId} (looked in ${root})`);
  }

  await assertEmptyTarget(opts.targetDir);
  await ensureDir(opts.targetDir);

  for (let i = 0; i < files.length; i++) {
    const rel = files[i];
    const sourceUrl = new URL(`${opts.templateId}/${rel}`, root);
    const { destRel, isTemplate } = mapName(rel);
    const destPath = join(opts.targetDir, destRel);
    await ensureDir(dirname(destPath));

    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch template file ${sourceUrl}: ${res.status}`);
    }

    if (isTemplate) {
      const source = await res.text();
      const rendered = source.replaceAll(PROJECT_NAME_TOKEN, opts.projectName);
      await Deno.writeTextFile(destPath, rendered);
    } else {
      const buf = new Uint8Array(await res.arrayBuffer());
      await Deno.writeFile(destPath, buf);
    }

    opts.onProgress?.({ current: i + 1, total: files.length, file: rel });
  }
}

/** Maps a template-relative file path to its scaffolded destination. */
export function mapName(relPath: string): { destRel: string; isTemplate: boolean } {
  const parts = relPath.split("/");
  const last = parts[parts.length - 1];
  let renamed = last;
  let isTemplate = false;

  if (renamed.endsWith(".tpl")) {
    renamed = renamed.slice(0, -".tpl".length);
    isTemplate = true;
  }
  if (renamed === "gitignore") renamed = ".gitignore";
  else if (renamed === "env.example") renamed = ".env.example";

  parts[parts.length - 1] = renamed;
  return { destRel: parts.join("/"), isTemplate };
}

function normaliseRoot(root: string): URL {
  const withSlash = root.endsWith("/") ? root : `${root}/`;
  try {
    return new URL(withSlash);
  } catch {
    return new URL(`file://${withSlash}`);
  }
}

async function loadManifest(root: URL): Promise<TemplateManifest> {
  const url = new URL("manifest.json", root);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load template manifest: ${res.status} ${url}`);
  }
  return await res.json() as TemplateManifest;
}

async function assertEmptyTarget(targetDir: string): Promise<void> {
  let entries: Deno.DirEntry[];
  try {
    entries = [];
    for await (const e of Deno.readDir(targetDir)) entries.push(e);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return;
    throw err;
  }
  if (entries.length > 0) {
    throw new Error(
      `Target directory is not empty: ${targetDir} (${entries.length} existing entries)`,
    );
  }
}
