import { App, Howl, type ListenOptions } from "../core/app.ts";
import { Builder, type BuildOptions } from "./builder.ts";
import { cssModulesPlugin } from "./plugins/css_modules.ts";
import * as path from "@std/path";
import type { AnyApiDefinition } from "../api/types.ts";
import { apiHandler } from "../api/api-handler.ts";

export interface HowlDevOptions<State = any>
  extends Omit<BuildOptions, "routeDir" | "islandDir" | "staticDir"> {
  importApp?: () => Promise<Howl<State> | { app: Howl<State> }> | Howl<State>;
}

/**
 * Wraps Builder with Howl-aware features:
 * - CSS Modules baked in
 * - React → Preact/compat alias baked in
 * - apis/ directory crawled automatically when app.fsApiRoutes() is called
 * - OpenAPI spec auto-exposed at /api/docs
 */
export class HowlBuilder<State = any> {
  #howl: Howl<State>;
  #options: HowlDevOptions<State>;
  #builders: Map<string, Builder<State>> = new Map();
  #apis: AnyApiDefinition[] = [];

  constructor(howl: Howl<State>, options: HowlDevOptions<State> = {}) {
    this.#howl = howl;
    this.#options = options;
    this.#setupBuilders();
  }

  #defaultAlias(): Record<string, string> {
    return {
      "react": "npm:preact/compat",
      "react-dom": "npm:preact/compat",
      "react/jsx-runtime": "npm:preact/jsx-runtime",
      "react/jsx-dev-runtime": "npm:preact/jsx-dev-runtime",
    };
  }

  #makeBuilderOptions(overrides: Partial<BuildOptions> = {}): BuildOptions {
    return {
      ...this.#options,
      alias: {
        ...this.#defaultAlias(),
        ...this.#options.alias,
      },
      plugins: [
        cssModulesPlugin(),
        ...(this.#options.plugins ?? []),
      ],
      ...overrides,
    };
  }

  #setupBuilders() {
    const clients = this.#howl.getClients();

    if (clients.length === 0) {
      this.#builders.set(
        "default",
        new Builder<State>(this.#makeBuilderOptions({
          routeDir: "pages",
        })),
      );
      return;
    }

    for (const client of clients) {
      this.#builders.set(
        client.name,
        new Builder<State>(this.#makeBuilderOptions({
          routeDir: `${client.dir}/pages`,
          islandDir: `${client.dir}/islands`,
          staticDir: `${client.dir}/static`,
          outDir: `${this.#options.outDir ?? "_howl"}/${client.name}`,
        })),
      );
    }
  }

  // --- API crawling ---

  async #crawlApis(): Promise<void> {
    if (!this.#howl.isApiRoutesEnabled()) return;

    const root = this.#options.root ?? Deno.cwd();
    // When serverEntry is provided (e.g. ./server/main.ts) look for apis/
    // inside that directory rather than project root.
    const serverEntry = this.#options.serverEntry;
    const serverBase = serverEntry
      ? path.dirname(
        path.isAbsolute(serverEntry) ? serverEntry : path.join(root, serverEntry),
      )
      : root;
    const apisDir = path.join(serverBase, "apis");

    try {
      const stat = await Deno.stat(apisDir);
      if (!stat.isDirectory) return;
    } catch {
      // no apis/ folder — skip silently
      return;
    }

    await this.#walkApis(apisDir);

    if (this.#apis.length > 0) {
      // deno-lint-ignore no-console
      console.info(`[howl] Found ${this.#apis.length} API definitions in apis/`);
    }
  }

  async #walkApis(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory) {
        await this.#walkApis(fullPath);
      } else if (entry.name.endsWith(".api.ts")) {
        try {
          const mod = await import(path.toFileUrl(fullPath).href);
          if (mod.default) {
            this.#apis.push(mod.default as AnyApiDefinition);
          }
        } catch (err) {
          // deno-lint-ignore no-console
          console.error(`[howl] Failed to load API: ${fullPath}`, err);
        }
      }
    }
  }

  #registerApis(app: Howl<State>): void {
    if (!this.#howl.isApiRoutesEnabled()) return;
    if (this.#apis.length === 0) return;

    apiHandler(app, this.#apis, app.getApiConfig() ?? null);
  }

  // --- Public API ---

  registerIsland(specifier: string): void {
    for (const builder of this.#builders.values()) {
      builder.registerIsland(specifier);
    }
  }

  async listen(options: ListenOptions = {}): Promise<void> {
    const { importApp } = this.#options;
    if (!importApp) {
      throw new Error(
        "HowlBuilder.listen() requires importApp in fullstack mode.",
      );
    }

    // Crawl apis/ before starting
    await this.#crawlApis();

    if (this.#builders.size === 1) {
      await this.#builders.values().next().value!.listen(async () => {
        const result = await Promise.resolve(importApp());
        const app = result instanceof Howl ? result : result.app;
        this.#registerApis(app);
        return app;
      }, options);
      return;
    }

    const clients = this.#howl.getClients();

    await Promise.all(
      Array.from(this.#builders.entries()).map(([name, builder]) => {
        const client = clients.find((c) => c.name === name)!;
        return builder.listen(
          async () => {
            const result = await Promise.resolve(importApp());
            const app = result instanceof Howl ? result : result.app;
            this.#registerApis(app);
            const clientApp = new App<State>({ basePath: client.mount });
            clientApp.mountApp(client.mount, app);
            return clientApp;
          },
          name === clients[0].name ? options : { port: 0 },
        );
      }),
    );
  }

  async build(): Promise<void> {
    // Crawl apis/ before build
    await this.#crawlApis();

    const app = this.#howl;

    await Promise.all(
      Array.from(this.#builders.entries()).map(async ([name, builder]) => {
        const applySnapshot = await builder.build({ mode: "production" });
        applySnapshot(app);
        // deno-lint-ignore no-console
        console.log(`[howl] Built client: ${name}`);
      }),
    );

    // Register APIs for production
    this.#registerApis(app);
  }

  /**
   * Get a specific client's builder by name.
   * Useful for registering plugins like tailwindPlugin.
   *
   * @example
   * tailwindPlugin(builder.getBuilder("default")!);
   */
  getBuilder(name = "default"): Builder<State> | undefined {
    return this.#builders.get(name);
  }

  /**
   * Get all discovered API definitions.
   * Available after listen() or build() is called.
   * Useful for generating a typed HTTP client.
   */
  getApis(): AnyApiDefinition[] {
    return this.#apis;
  }
}
