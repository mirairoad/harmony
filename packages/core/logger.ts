// packages/core/logger.ts
import * as colors from "@std/fmt/colors";

// deno-lint-ignore-file no-explicit-any

export interface LoggerOptions {
  /** Enable debug output. No-ops when false. @default false */
  debug?: boolean;
  /** Messages to suppress — matched via includes() */
  ignore?: string[];
}

type ConsoleMethod = "log" | "error" | "warn" | "info" | "debug";

const METHOD_COLORS: Record<ConsoleMethod, (str: string) => string> = {
  log: (s) => colors.rgb24(s, 0x57c26e), // green
  error: (s) => colors.rgb24(s, 0xe74c3c), // red
  warn: (s) => colors.rgb24(s, 0xf39c12), // yellow
  info: (s) => colors.rgb24(s, 0x3498db), // blue
  debug: (s) => colors.rgb24(s, 0x9b59b6), // howl purple
};

const DEFAULT_IGNORE = [
  "/*! 🌼 daisyUI",
];

function getTimestamp(): string {
  const d = new Date();
  return [
    d.getHours().toString().padStart(2, "0"),
    d.getMinutes().toString().padStart(2, "0"),
    d.getSeconds().toString().padStart(2, "0"),
  ].join(":") + "." + d.getMilliseconds().toString().padStart(3, "0");
}

/**
 * Howl's built-in logger.
 * Patches globalThis.console when installed.
 * Adds timestamp, PID, and method-colored output in local mode.
 *
 * @example
 * const app = new Howl({ mode: "fullstack", logger: true, debug: true });
 */
export class HowlLogger {
  #debug: boolean;
  #ignore: string[];
  #isLocal: boolean;
  #originals: Record<ConsoleMethod, (...args: any[]) => void>;
  #installed = false;

  constructor(options: LoggerOptions = {}) {
    this.#debug = options.debug ?? false;
    this.#ignore = [...DEFAULT_IGNORE, ...(options.ignore ?? [])];
    this.#isLocal = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;
    this.#originals = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };
  }

  /**
   * Install logger — patches globalThis.console.
   * Safe to call multiple times, installs only once.
   */
  install(): void {
    if (this.#installed) return;
    this.#installed = true;

    const patch = (method: ConsoleMethod) => {
      console[method] = (...args: any[]) => this.#output(method, ...args);
    };

    patch("log");
    patch("error");
    patch("warn");
    patch("info");

    if (this.#debug) {
      patch("debug");
    } else {
      console.debug = () => {};
    }
  }

  /**
   * Uninstall logger — restores original console methods.
   */
  uninstall(): void {
    if (!this.#installed) return;
    this.#installed = false;
    for (const method of Object.keys(this.#originals) as ConsoleMethod[]) {
      console[method] = this.#originals[method];
    }
  }

  #output(method: ConsoleMethod, ...args: any[]): void {
    if (!args.length) return;

    // Filter ignored messages
    const first = args[0];
    if (
      typeof first === "string" &&
      this.#ignore.some((msg) => first.includes(msg))
    ) return;

    if (!this.#isLocal) {
      // Production — plain output, no decoration
      this.#originals[method](...args);
      return;
    }

    const pid = Deno.pid;
    const time = getTimestamp();
    const prefix = METHOD_COLORS[method](`[${time}] [${pid}]`);

    // Handle JSON.stringify pattern: console.log(data, null, 2)
    if (args.length === 3 && args[1] === null && typeof args[2] === "number") {
      const formatted = JSON.stringify(args[0], null, args[2]);
      this.#originals[method](prefix, formatted);
      return;
    }

    this.#originals[method](prefix, ...args);
  }

  /**
   * Direct logger methods — bypass console patching.
   * Useful for structured logging outside of console.
   */
  log(...args: any[]) {
    this.#output("log", ...args);
  }
  error(...args: any[]) {
    this.#output("error", ...args);
  }
  warn(...args: any[]) {
    this.#output("warn", ...args);
  }
  info(...args: any[]) {
    this.#output("info", ...args);
  }
  debug(...args: any[]) {
    if (!this.#debug) return;
    this.#output("debug", ...args);
  }
}
