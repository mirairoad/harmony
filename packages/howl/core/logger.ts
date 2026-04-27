// packages/core/logger.ts
import * as colors from "@std/fmt/colors";

// deno-lint-ignore-file no-explicit-any

/**
 * Options accepted by {@linkcode HowlLogger}.
 */
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
  warn: (s) => colors.rgb24(s, 0xfde68a), // light yellow
  info: (s) => colors.rgb24(s, 0x3498db), // blue
  debug: (s) => colors.rgb24(s, 0xbf00ff), // acid purple
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

// Process-wide guard so multiple Howl apps in the same process don't fight
// over globalThis.console. The first install wins; subsequent calls become
// no-ops, but each HowlLogger instance can still emit through its own direct
// methods (`logger.log/info/...`) so per-app log channels remain useful.
const INSTALL_MARKER: unique symbol = Symbol.for("howl.logger.installed");
type GlobalWithMarker = typeof globalThis & { [INSTALL_MARKER]?: HowlLogger };

/**
 * Howl's built-in logger.
 *
 * Decorates output with a timestamp + PID prefix and method-tinted colors
 * in local mode; passes through plain in production. The first
 * {@linkcode install} call in a process patches `globalThis.console`; later
 * loggers in the same process keep their direct {@linkcode log}/{@linkcode info}/...
 * methods working but skip the global patch to avoid clobbering each other.
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

  /** Build a logger with optional debug/ignore configuration. */
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
   * Install the logger as the global console transport.
   *
   * Idempotent both per-instance and process-wide: if another `HowlLogger`
   * has already claimed the global console, this call is a no-op and the
   * direct emitter methods (`log`, `info`, `warn`, `error`, `debug`) on
   * this instance still produce the same formatted output. This prevents
   * multi-app processes (tests, mountApp, sub-apps) from hijacking each
   * other's console output.
   */
  install(): void {
    if (this.#installed) return;
    const g = globalThis as GlobalWithMarker;
    if (g[INSTALL_MARKER] !== undefined) {
      // Some other HowlLogger already owns the global console. Skip the
      // patch — direct methods on this instance still work.
      this.#installed = true;
      return;
    }
    g[INSTALL_MARKER] = this;
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
   *
   * Only the instance that originally claimed the global console actually
   * restores it; uninstall on any other logger is a no-op on the global
   * surface (it still flips its own `installed` flag back to false).
   */
  uninstall(): void {
    if (!this.#installed) return;
    this.#installed = false;
    const g = globalThis as GlobalWithMarker;
    if (g[INSTALL_MARKER] !== this) return;
    delete g[INSTALL_MARKER];
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
  /** Emit a `log`-level message through the logger. */
  log(...args: any[]): void {
    this.#output("log", ...args);
  }
  /** Emit an `error`-level message through the logger. */
  error(...args: any[]): void {
    this.#output("error", ...args);
  }
  /** Emit a `warn`-level message through the logger. */
  warn(...args: any[]): void {
    this.#output("warn", ...args);
  }
  /** Emit an `info`-level message through the logger. */
  info(...args: any[]): void {
    this.#output("info", ...args);
  }
  /** Emit a `debug`-level message — silently dropped when debug is disabled. */
  debug(...args: any[]): void {
    if (!this.#debug) return;
    this.#output("debug", ...args);
  }
}
