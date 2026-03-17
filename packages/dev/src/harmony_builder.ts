import { App, type ListenOptions } from "@harmony/core";
import type { Harmony } from "@harmony/core";
import { Builder, type BuildOptions } from "./builder.ts";
import { cssModulesPlugin } from "./plugins/css_modules.ts";

export interface HarmonyDevOptions<State = any>
  extends Omit<BuildOptions, "routeDir" | "islandDir" | "staticDir"> {
  importApp?: () => Promise<{ app: App<State> } | App<State>>;
}

/**
 * Wraps Builder with Harmony-aware multi-client support and mode switching.
 *
 * Baked-in defaults:
 * - CSS Modules support via cssModulesPlugin
 * - React → Preact/compat alias for React ecosystem compatibility
 *
 * In "backend" mode: no build pipeline runs.
 * In "fullstack" mode with single client: delegates to Builder directly.
 * In "fullstack" mode with multiple clients: one Builder per client.
 */
export class HarmonyBuilder<State = any> {
  #harmony: Harmony<State>;
  #options: HarmonyDevOptions<State>;
  #builders: Map<string, Builder<State>> = new Map();

  constructor(harmony: Harmony<State>, options: HarmonyDevOptions<State> = {}) {
    this.#harmony = harmony;
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
      // Merge user alias on top of defaults
      alias: {
        ...this.#defaultAlias(),
        ...this.#options.alias,
      },
      // Prepend CSS modules plugin, then user plugins
      plugins: [
        cssModulesPlugin(),
        ...(this.#options.plugins ?? []),
      ],
      ...overrides,
    };
  }

  #setupBuilders() {
    if (this.#harmony.getMode() === "backend") return;

    const clients = this.#harmony.getClients();

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
          outDir: `${this.#options.outDir ?? "_harmony"}/${client.name}`,
        })),
      );
    }
  }

  registerIsland(specifier: string): void {
    for (const builder of this.#builders.values()) {
      builder.registerIsland(specifier);
    }
  }

  async listen(options: ListenOptions = {}): Promise<void> {
    if (this.#harmony.getMode() === "backend") {
      await this.#harmony.getApp().listen(options);
      return;
    }

    const { importApp } = this.#options;
    if (!importApp) {
      throw new Error(
        "HarmonyBuilder.listen() requires importApp in fullstack mode.",
      );
    }

    if (this.#builders.size === 1) {
      await this.#builders.values().next().value!.listen(importApp, options);
      return;
    }

    const clients = this.#harmony.getClients();

    await Promise.all(
      Array.from(this.#builders.entries()).map(([name, builder]) => {
        const client = clients.find((c) => c.name === name)!;
        return builder.listen(
          async () => {
            const result = await importApp();
            const app = result instanceof App ? result : result.app;
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
    if (this.#harmony.getMode() === "backend") {
      console.log("Backend mode: skipping client build.");
      return;
    }

    const app = this.#harmony.getApp();

    await Promise.all(
      Array.from(this.#builders.entries()).map(async ([name, builder]) => {
        const applySnapshot = await builder.build({ mode: "production" });
        applySnapshot(app);
        console.log(`Built client: ${name}`);
      }),
    );
  }

  /**
   * Get a specific client's builder by name.
   * Useful for registering plugins like tailwind on a specific client.
   *
   * @example
   * tailwindPlugin(builder.getBuilder("default")!);
   */
  getBuilder(name = "default"): Builder<State> | undefined {
    return this.#builders.get(name);
  }
}
