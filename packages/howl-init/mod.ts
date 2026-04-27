/**
 * Howl project scaffolder. Entry point for `deno run -A jsr:@hushkey/howl-init <name>`.
 */
export function main(args: string[] = Deno.args): void {
  const [name] = args;
  if (!name) {
    console.error("usage: howl-init <project-name>");
    Deno.exit(1);
  }
  console.log(`howl-init: scaffolding "${name}" — not implemented yet`);
}

if (import.meta.main) main();
