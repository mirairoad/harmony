import * as colors from "@std/fmt/colors";
import { App, type ListenOptions } from "./app.ts";
import type { Middleware } from "./middlewares/mod.ts";

export type HarmonyMode = "fullstack" | "backend";

export interface ClientConfig {
  /** Unique name for this client app */
  name: string;
  /** Directory containing routes, islands, static assets */
  dir: string;
  /** URL prefix this client is mounted at */
  mount: string;
}

export interface ApiConfig {
  /** Directory containing API route definitions */
  dir: string;
  /** URL prefix for all API routes */
  prefix: string;
  /** Expose OpenAPI spec at <prefix>/spec. Default: false */
  spec?: boolean;
}

export interface HarmonyOptions {
  basePath?: string;
  mode: HarmonyMode;
}

// deno-lint-ignore no-explicit-any
export class Harmony<State = any> {
  #app: App<State>;
  #mode: HarmonyMode;
  #clients: ClientConfig[] = [];
  #apiConfig: ApiConfig | null = null;

  constructor(options: HarmonyOptions) {
    this.#mode = options.mode;
    this.#app = new App<State>({
      basePath: options.basePath,
      mode: options.mode === "fullstack" ? "production" : "production",
    });
  }

  /**
   * Register a client app.
   * Each client is an isolated island/route build mounted at a path.
   * No SPA navigation crosses client boundaries.
   *
   * @example
   * app.client({ name: "main", dir: "./apps/main", mount: "/" });
   * app.client({ name: "auth", dir: "./apps/auth", mount: "/auth" });
   */
  client(config: ClientConfig): this {
    if (this.#mode === "backend") {
      throw new Error(
        `Cannot register client "${config.name}" in backend mode. ` +
        `Switch to mode: "fullstack" to enable client apps.`,
      );
    }
    this.#clients.push(config);
    return this;
  }

  /**
   * Register the API layer.
   * Shared across all clients. Runs in both fullstack and backend modes.
   *
   * @example
   * app.api({ dir: "./api", prefix: "/api/v1", spec: true });
   */
  api(config: ApiConfig): this {
    this.#apiConfig = config;
    return this;
  }

  /**
   * Add middleware to the shared backend.
   */
  use(...middleware: Middleware<State>[]): this {
    this.#app.use(...middleware);
    return this;
  }

  /**
   * Returns registered client configs.
   * Used by the Builder to set up per-client island/static pipelines.
   */
  getClients(): ClientConfig[] {
    return this.#clients;
  }

  getApiConfig(): ApiConfig | null {
    return this.#apiConfig;
  }

  getMode(): HarmonyMode {
    return this.#mode;
  }

  /**
   * Get the underlying App instance.
   * Used internally by the dev server and builder.
   */
  getApp(): App<State> {
    return this.#app;
  }

  handler() {
    return this.#app.handler();
  }

  async listen(options: ListenOptions = {}): Promise<void> {
    if (!options.onListen) {
      options.onListen = this.#createOnListen(options);
    }
    await this.#app.listen(options);
  }

  #createOnListen(options: ListenOptions) {
    return (params: Deno.NetAddr) => {
      console.log();
      console.log(colors.bgRgb8(colors.rgb8(" 🎵 Harmony ready  ", 0), 93));

      const protocol = "key" in options && options.key ? "https:" : "http:";
      let hostname = params.hostname;
      if (hostname === "0.0.0.0" || hostname === "::") hostname = "localhost";

      const modeLabel = colors.dim(`[${this.#mode}]`);
      const localLabel = colors.bold("Local:");
      const address = colors.cyan(`${protocol}//${hostname}:${params.port}/`);
      console.log(`    ${localLabel}  ${address}  ${modeLabel}\n`);

      if (this.#clients.length > 0) {
        console.log(colors.dim("  clients:"));
        for (const client of this.#clients) {
          console.log(
            `    ${colors.green("▸")} ${colors.bold(client.name)} → ${colors.cyan(client.mount)}`
          );
        }
        console.log();
      }
    };
  }
}