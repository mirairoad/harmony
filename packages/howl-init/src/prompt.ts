/**
 * Prompt dependencies the CLI uses to gather missing inputs.
 *
 * Implementations are injected by the caller — TTY by default, fakes in tests —
 * so `runInit` never reads from stdin directly.
 */
export interface PromptDeps {
  /** Ask for free-form text. Returns trimmed input or the default. */
  ask(question: string, defaultValue?: string): string;
  /** Pick one of a fixed list of options. */
  pick<T>(question: string, options: PromptOption<T>[]): T;
}

/** A selectable option presented to the user by {@link PromptDeps.pick}. */
export interface PromptOption<T> {
  /** Short label shown in the list. */
  label: string;
  /** Optional one-line elaboration. */
  description?: string;
  /** Value returned when the option is chosen. */
  value: T;
}

/**
 * Thrown when the user cancels an interactive prompt (Ctrl+D / EOF).
 *
 * `mod.ts` catches this and exits without scaffolding so the user can abort
 * mid-flow without producing a half-written project directory.
 */
export class PromptCancelled extends Error {
  constructor() {
    super("Cancelled");
    this.name = "PromptCancelled";
  }
}

/** Default TTY-backed prompts used when the CLI runs interactively. */
export const ttyPrompt: PromptDeps = {
  ask(question, defaultValue) {
    const suffix = defaultValue ? ` (${defaultValue})` : "";
    const raw = prompt(`${question}${suffix}:`);
    if (raw === null) throw new PromptCancelled();
    const ans = raw.trim();
    return ans.length > 0 ? ans : (defaultValue ?? "");
  },
  pick(question, options) {
    if (options.length === 0) throw new Error("pick: no options provided");
    console.log(`\n${question}`);
    options.forEach((opt, i) => {
      const desc = opt.description ? ` — ${opt.description}` : "";
      console.log(`  ${i + 1}) ${opt.label}${desc}`);
    });
    while (true) {
      const raw = prompt(`Select [1-${options.length}]:`);
      if (raw === null) throw new PromptCancelled();
      const n = Number(raw.trim());
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        return options[n - 1].value;
      }
      console.log("Invalid selection, try again.");
    }
  },
};
