import { parseArgs } from "@std/cli/parse-args";
import { isAbsolute, join, resolve } from "@std/path";
import { findTemplate, type TemplateMeta, templates } from "./src/templates.ts";
import { PromptCancelled, type PromptDeps, ttyPrompt } from "./src/prompt.ts";
import { scaffold } from "./src/scaffold.ts";

/** Inputs to {@link runInit}. All fields optional — missing ones are filled by `prompt`. */
export interface RunInitOptions {
  /** Project name. Becomes the target folder name (relative to `cwd`) and the `deno.json#name`. */
  name?: string;
  /** Template id — must match a folder under `templatesRoot`. */
  template?: string;
  /** Working directory the project folder is created under. Defaults to `Deno.cwd()`. */
  cwd?: string;
  /** Prompt implementation. Defaults to {@link ttyPrompt}; tests inject a fake. */
  prompt?: PromptDeps;
  /** Templates root override; tests use this to point at a fixture folder. */
  templatesRoot?: string;
}

/** Outcome of a successful init run. */
export interface RunInitResult {
  /** Absolute path of the created project directory. */
  path: string;
  /** Project name resolved from args or prompt. */
  name: string;
  /** Template id used to scaffold the project. */
  template: string;
}

/**
 * Programmatic entry — fills missing inputs via the prompt deps, then scaffolds.
 *
 * Tests should call this with explicit `name`, `template`, `cwd`, and `templatesRoot`
 * so no prompts run.
 */
export async function runInit(opts: RunInitOptions = {}): Promise<RunInitResult> {
  const prompts = opts.prompt ?? ttyPrompt;
  const cwd = opts.cwd ?? Deno.cwd();

  const name = (opts.name ?? prompts.ask("Project name", "my-howl-app")).trim();
  if (!name) throw new Error("Project name is required");
  validateProjectName(name);

  const templateId = resolveTemplateId(opts.template, prompts);
  const targetDir = isAbsolute(name) ? name : resolve(join(cwd, name));

  await scaffold({
    templateId,
    targetDir,
    projectName: name,
    templatesRoot: opts.templatesRoot,
  });

  return { path: targetDir, name, template: templateId };
}

/** CLI entry — parses argv, calls {@link runInit}, prints next-steps on success. */
export async function main(argv: string[] = Deno.args): Promise<void> {
  const flags = parseArgs(argv, {
    string: ["name", "template"],
    boolean: ["help"],
    alias: { h: "help", n: "name", t: "template" },
  });

  if (flags.help) {
    printHelp();
    return;
  }

  const positional = flags._[0]?.toString();
  try {
    const result = await runInit({
      name: flags.name ?? positional,
      template: flags.template,
    });
    printNextSteps(result);
  } catch (err) {
    if (err instanceof PromptCancelled) {
      console.error("\nhowl-init: cancelled — no project created.");
      Deno.exit(130);
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`howl-init: ${msg}`);
    Deno.exit(1);
  }
}

function resolveTemplateId(requested: string | undefined, prompts: PromptDeps): string {
  if (requested) {
    const meta = findTemplate(requested);
    if (!meta) {
      const known = templates.map((t) => t.id).join(", ");
      throw new Error(`Unknown template "${requested}". Available: ${known}`);
    }
    return meta.id;
  }
  const choice = prompts.pick<TemplateMeta>(
    "Choose a template",
    templates.map((t) => ({ label: t.label, description: t.description, value: t })),
  );
  return choice.id;
}

const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

function validateProjectName(name: string): void {
  if (!PROJECT_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid project name "${name}" — use letters, digits, '-', '_', '.' (must start with letter or digit)`,
    );
  }
}

function printHelp(): void {
  const ids = templates.map((t) => `    ${t.id.padEnd(12)} ${t.description}`).join("\n");
  console.log(
    [
      "howl-init — scaffold a new Howl project",
      "",
      "Usage:",
      "  deno run -Ar jsr:@hushkey/howl-init [name] [--template <id>]",
      "",
      "Templates:",
      ids,
      "",
      "Flags:",
      "  -n, --name <name>       Project name (also accepted as positional arg)",
      "  -t, --template <id>     Template id (skip the picker)",
      "  -h, --help              Show this help",
    ].join("\n"),
  );
}

function printNextSteps(result: RunInitResult): void {
  console.log(`\n✓ Created ${result.name} at ${result.path}`);
  console.log(`  template: ${result.template}\n`);
  console.log("Next:");
  console.log(`  cd ${result.name}`);
  console.log(`  deno task dev`);
}

if (import.meta.main) await main();
