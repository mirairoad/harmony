import { App, type ListenOptions } from "@harmony/core";
import type { Harmony } from "@harmony/core";
import { Builder, type BuildOptions } from "./builder.ts";

export interface HarmonyDevOptions<State = any> extends Omit<BuildOptions, "routeDir" | "islandDir" | "staticDir"> {
    importApp?: () => Promise<{ app: App<State> } | App<State>>;
  }
  export class HarmonyBuilder<State = any> {
    #harmony: Harmony<State>;
    #options: HarmonyDevOptions<State>;
    #builders: Map<string, Builder<State>> = new Map();
  
    constructor(harmony: Harmony<State>, options: HarmonyDevOptions<State> = {}) {
      this.#harmony = harmony;
      this.#options = options;
      this.#setupBuilders();
    }

  #setupBuilders() {
    if (this.#harmony.getMode() === "backend") return;

    const clients = this.#harmony.getClients();

    if (clients.length === 0) {
      this.#builders.set("default", new Builder<State>(this.#options));
      return;
    }

    for (const client of clients) {
      this.#builders.set(
        client.name,
        new Builder<State>({
          ...this.#options,
          routeDir: `${client.dir}/routes`,
          islandDir: `${client.dir}/islands`,
          staticDir: `${client.dir}/static`,
          outDir: `${this.#options.outDir ?? "_harmony"}/${client.name}`,
        }),
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

  getBuilder(name: string): Builder<State> | undefined {
    return this.#builders.get(name);
  }
}