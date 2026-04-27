import { dirname, fromFileUrl, join, relative } from "@std/path";
import { ensureDir, walk } from "@std/fs";

/** Default root containing the shipped template folders. */
export const DEFAULT_TEMPLATES_ROOT: string = fromFileUrl(
  new URL("../templates/", import.meta.url),
);

/** Token replaced inside `.tpl` files with the project name. */
export const PROJECT_NAME_TOKEN = "{{PROJECT_NAME}}";

/** Inputs to {@link scaffold}. */
export interface ScaffoldOptions {
  /** Template id — must match a folder under `templatesRoot`. */
  templateId: string;
  /** Absolute path of the new project directory. Created if missing; must be empty if it exists. */
  targetDir: string;
  /** Project name written into `deno.json` and any other token sites. */
  projectName: string;
  /** Override the templates root (used in tests). Defaults to {@link DEFAULT_TEMPLATES_ROOT}. */
  templatesRoot?: string;
}

/**
 * Copies a template folder into `targetDir`.
 *
 * File rules:
 * - Files ending in `.tpl` have the suffix stripped and `{{PROJECT_NAME}}` tokens replaced.
 * - A file named exactly `gitignore` is renamed to `.gitignore` (dotfiles inside `templates/`
 *   would otherwise be filtered by some packaging tools).
 * - All other files are copied byte-for-byte.
 */
export async function scaffold(opts: ScaffoldOptions): Promise<void> {
  const root = opts.templatesRoot ?? DEFAULT_TEMPLATES_ROOT;
  const sourceDir = join(root, opts.templateId);

  const sourceStat = await Deno.stat(sourceDir).catch(() => null);
  if (!sourceStat?.isDirectory) {
    throw new Error(`Template not found: ${opts.templateId} (looked in ${sourceDir})`);
  }

  await assertEmptyTarget(opts.targetDir);
  await ensureDir(opts.targetDir);

  for await (const entry of walk(sourceDir, { includeDirs: false })) {
    const rel = relative(sourceDir, entry.path);
    const { destRel, isTemplate } = mapName(rel);
    const destPath = join(opts.targetDir, destRel);
    await ensureDir(dirname(destPath));

    if (isTemplate) {
      const source = await Deno.readTextFile(entry.path);
      const rendered = source.replaceAll(PROJECT_NAME_TOKEN, opts.projectName);
      await Deno.writeTextFile(destPath, rendered);
    } else {
      await Deno.copyFile(entry.path, destPath);
    }
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
