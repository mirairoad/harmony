import * as colors from "@std/fmt/colors";
import { App, type ListenOptions } from "./app.ts";
import type { MaybeLazyMiddleware, Middleware } from "./middlewares/mod.ts";
import type { LayoutConfig, MaybeLazy, Route, RouteConfig } from "./types.ts";
import type { RouteComponent } from "./segments.ts";

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
  /**
   * "fullstack" — islands, builder, client runtime active
   * "backend"   — zero client build, pure API server
   */
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
      mode: "production",
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
   * Add one or more middlewares at the root or specified path.
   *
   * @example
   * app.use(authMiddleware);
   * app.use("/admin", adminOnly);
   */
  use(...middleware: MaybeLazyMiddleware<State>[]): this;
  use(path: string, ...middleware: MaybeLazyMiddleware<State>[]): this;
  use(
    pathOrMiddleware: string | MaybeLazyMiddleware<State>,
    ...middlewares: MaybeLazyMiddleware<State>[]
  ): this {
    if (typeof pathOrMiddleware === "string") {
      this.#app.use(pathOrMiddleware, ...middlewares);
    } else {
      this.#app.use(pathOrMiddleware, ...middlewares);
    }
    return this;
  }

  /**
   * Add a GET handler at the specified path.
   *
   * @example
   * app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
   */
  get(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.get(path, ...middlewares);
    return this;
  }

  /**
   * Add a POST handler at the specified path.
   *
   * @example
   * app.post("/api/users", createUserHandler);
   */
  post(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.post(path, ...middlewares);
    return this;
  }

  /**
   * Add a PATCH handler at the specified path.
   *
   * @example
   * app.patch("/api/users/:id", updateUserHandler);
   */
  patch(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.patch(path, ...middlewares);
    return this;
  }

  /**
   * Add a PUT handler at the specified path.
   *
   * @example
   * app.put("/api/users/:id", replaceUserHandler);
   */
  put(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.put(path, ...middlewares);
    return this;
  }

  /**
   * Add a DELETE handler at the specified path.
   *
   * @example
   * app.delete("/api/users/:id", deleteUserHandler);
   */
  delete(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.delete(path, ...middlewares);
    return this;
  }

  /**
   * Add a HEAD handler at the specified path.
   */
  head(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.head(path, ...middlewares);
    return this;
  }

  /**
   * Add a handler for all HTTP verbs at the specified path.
   *
   * @example
   * app.all("/api/*", corsMiddleware);
   */
  all(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#app.all(path, ...middlewares);
    return this;
  }

  /**
   * Add a route with optional config.
   *
   * @example
   * app.route("/about", { component: AboutPage });
   */
  route(
    path: string,
    route: MaybeLazy<Route<State>>,
    config?: RouteConfig,
  ): this {
    this.#app.route(path, route, config);
    return this;
  }

  /**
   * Mount file-system based routes collected by the Builder.
   * Call this once after registering clients.
   *
   * @example
   * app.fsRoutes();
   */
  fsRoutes(pattern = "*"): this {
    this.#app.fsRoutes(pattern);
    return this;
  }

  /**
   * Set a custom 404 handler.
   *
   * @example
   * app.notFound((ctx) => ctx.render(<NotFoundPage />));
   */
  notFound(routeOrMiddleware: Route<State> | Middleware<State>): this {
    this.#app.notFound(routeOrMiddleware);
    return this;
  }

  /**
   * Set an error handler at a specific path.
   *
   * @example
   * app.onError("/api/*", apiErrorHandler);
   */
  onError(
    path: string,
    routeOrMiddleware: Route<State> | Middleware<State>,
  ): this {
    this.#app.onError(path, routeOrMiddleware);
    return this;
  }

  /**
   * Set the app wrapper component (outermost layout).
   *
   * @example
   * app.appWrapper(RootLayout);
   */
  appWrapper(component: RouteComponent<State>): this {
    this.#app.appWrapper(component);
    return this;
  }

  /**
   * Add a layout component at a path.
   *
   * @example
   * app.layout("/dashboard", DashboardLayout);
   */
  layout(
    path: string,
    component: RouteComponent<State>,
    config?: LayoutConfig,
  ): this {
    this.#app.layout(path, component, config);
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
            `    ${colors.green("▸")} ${colors.bold(client.name)} → ${colors.cyan(client.mount)}`,
          );
        }
        console.log();
      }
    };
  }
}
