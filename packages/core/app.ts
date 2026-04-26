import { trace } from "@opentelemetry/api";
import { DENO_DEPLOYMENT_ID } from "../utils/build-id.ts";
import * as colors from "@std/fmt/colors";
import { type MaybeLazyMiddleware, type Middleware, runMiddlewares } from "./middlewares/mod.ts";
import { Context } from "./context.ts";
import { mergePath, type Method, UrlPatternRouter } from "./router.ts";
import type { HowlConfig, ResolvedHowlConfig } from "./config.ts";
import type { BuildCache } from "./build_cache.ts";
import { HttpError } from "./error.ts";
import type { LayoutConfig, MaybeLazy, Route, RouteConfig } from "./types.ts";
import type { RouteComponent } from "./segments.ts";
import {
  type ApiRouteCommand,
  applyCommands,
  type Command,
  CommandType,
  DEFAULT_NOT_ALLOWED_METHOD,
  DEFAULT_NOT_FOUND,
  newAppCmd,
  newErrorCmd,
  newHandlerCmd,
  newLayoutCmd,
  newMiddlewareCmd,
  newNotFoundCmd,
  newRouteCmd,
} from "./commands.ts";
import { MockBuildCache } from "./test_utils.ts";
import { HowlLogger, type LoggerOptions } from "./logger.ts";
/**
 * Configuration for a registered client app — an isolated build of routes/islands
 * mounted at a path.
 */
export interface ClientConfig {
  /** Unique client name; used as the build cache namespace. */
  name: string;
  /** Absolute or root-relative directory containing the client's pages/islands. */
  dir: string;
  /** URL path the client is mounted at (e.g. `/`, `/admin`). */
  mount: string;
}

/**
 * Configuration for the file-system API route loader.
 */
export interface ApiConfig {
  /** Directory (absolute or root-relative) to crawl for `*.api.ts` files. */
  dir: string;
  /** URL prefix prepended to inferred API paths (e.g. `/api`). */
  prefix: string;
  /** Whether to expose the generated OpenAPI spec endpoint. */
  spec?: boolean;
}

// deno-lint-ignore no-explicit-any
export const DEFAULT_CONN_INFO: any = {
  localAddr: { transport: "tcp", hostname: "localhost", port: 8080 },
  remoteAddr: { transport: "tcp", hostname: "localhost", port: 1234 },
};

const defaultOptionsHandler = (methods: string[]): () => Promise<Response> => {
  return () =>
    Promise.resolve(
      new Response(null, {
        status: 204,
        headers: { Allow: methods.join(", ") },
      }),
    );
};

// deno-lint-ignore require-await
const DEFAULT_ERROR_HANDLER = async <State>(ctx: Context<State>) => {
  const { error } = ctx;
  if (error instanceof HttpError) {
    if (error.status >= 500) {
      // deno-lint-ignore no-console
      console.error(error);
    }
    return new Response(error.message, { status: error.status });
  }
  // deno-lint-ignore no-console
  console.error(error);
  return new Response("Internal server error", { status: 500 });
};

function getNetworkIp(): string | null {
  try {
    const ifaces = Deno.networkInterfaces();
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.address.startsWith("127.")) {
        return iface.address;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Options accepted by {@linkcode Howl.listen}.
 *
 * Mirrors `Deno.ServeTcpOptions` (and optional TLS key/cert) plus an optional
 * `remoteAddress` string used purely for the dev-server startup banner.
 */
export type ListenOptions =
  & Partial<Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem>
  & {
    /** Optional remote URL printed on startup (informational only). */
    remoteAddress?: string;
  };

function createOnListen(
  basePath: string,
  options: ListenOptions,
): (localAddr: Deno.NetAddr) => void {
  return (params) => {
    if (DENO_DEPLOYMENT_ID) return;

    const pathname = basePath + "/";
    const protocol = "key" in options && options.key && options.cert ? "https:" : "http:";

    let hostname = params.hostname;
    if (
      Deno.build.os === "windows" &&
      (hostname === "0.0.0.0" || hostname === "::")
    ) {
      hostname = "localhost";
    }
    hostname = hostname.startsWith("::") ? `[${hostname}]` : hostname;

    const address = colors.rgb24(
      `${protocol}//${hostname}:${params.port}${pathname}`,
      0x9b59b6,
    );
    const networkIp = getNetworkIp();

    // deno-lint-ignore no-console
    console.log();
    // deno-lint-ignore no-console
    console.log(
      colors.bgRgb24(colors.rgb24(" 🐺 Howl ready   ", 0xffffff), 0x472773),
    );
    // deno-lint-ignore no-console
    console.log(`    ${colors.bold("Local:")}    ${address}`);
    if (networkIp) {
      // deno-lint-ignore no-console
      console.log(
        `    ${colors.bold("Network:")}  ${
          colors.rgb24(
            `${protocol}//${networkIp}:${params.port}${pathname}`,
            0x9b59b6,
          )
        }  ${colors.dim("← phone/tablet")}`,
      );
    }
    if (options.remoteAddress) {
      // deno-lint-ignore no-console
      console.log(
        `    ${colors.bold("Remote:")}   ${colors.rgb24(options.remoteAddress, 0x9b59b6)}`,
      );
    }
    // deno-lint-ignore no-console
    console.log();
  };
}

function listenOnFreePort(
  options: ListenOptions,
  handler: (request: Request, info?: Deno.ServeHandlerInfo) => Promise<Response>,
) {
  let firstError = null;
  for (let port = 8000; port < 8020; port++) {
    try {
      return Deno.serve({ ...options, port }, handler);
    } catch (err) {
      if (err instanceof Deno.errors.AddrInUse) {
        if (!firstError) firstError = err;
        continue;
      }
      throw err;
    }
  }
  throw firstError;
}

/** @internal Returns the {@linkcode BuildCache} attached to a Howl app, or `null`. */
export let getBuildCache: <State>(app: Howl<State>) => BuildCache<State> | null;
/** @internal Attaches a {@linkcode BuildCache} to a Howl app and locks the run mode. */
export let setBuildCache: <State>(
  app: Howl<State>,
  cache: BuildCache<State>,
  mode: "development" | "production",
) => void;
/** @internal Installs an error interceptor invoked when a middleware throws. */
export let setErrorInterceptor: <State>(
  app: Howl<State>,
  fn: (err: unknown) => void,
) => void;

const NOOP = () => {};

/**
 * Constructor options for {@linkcode Howl}.
 *
 * Extends the resolved {@linkcode HowlConfig} (basePath, mode, root) with
 * optional per-app logger settings.
 */
export interface HowlOptions extends HowlConfig {
  /**
   * Enable Howl's built-in logger.
   * Adds timestamp and PID to all console output.
   * @default false
   */
  logger?: boolean;
  /**
   * Enable debug logging. No-ops when false.
   * @default false
   */
  debug?: boolean;
  /**
   * Custom logger options — ignored if logger: false.
   */
  loggerOptions?: LoggerOptions;
}

/**
 * The Howl application — single unified class for routing,
 * middleware, server startup, and framework configuration.
 *
 * @example
 * ```ts
 * import { Howl } from "@hushkey/howl";
 *
 * const app = new Howl({ mode: "production", logger: true });
 *
 * app.get("/api/ping", (ctx) => ctx.json({ ok: true }));
 * app.fsClientRoutes();
 *
 * export default { fetch: app.handler() };
 * ```
 */
// deno-lint-ignore no-explicit-any
export class Howl<State = any> {
  #clients: ClientConfig[] = [];
  #getBuildCache: () => BuildCache<State> | null = () => null;
  #commands: Command<State>[] = [];
  #onError: (err: unknown) => void = NOOP;
  #logger: HowlLogger | null = null;
  #apiRoutesEnabled = false;
  // deno-lint-ignore no-explicit-any
  #apiConfig: any = null;
  #apiRouteCmd: ApiRouteCommand<State> | null = null;

  static {
    getBuildCache = (app) => app.#getBuildCache();
    setBuildCache = (app, cache, mode: "development" | "production") => {
      app.config.root = cache.root;
      app.config.mode = mode;
      app.#getBuildCache = () => cache;
    };
    setErrorInterceptor = (app, fn) => {
      app.#onError = fn;
    };
  }

  /** The resolved Howl configuration. */
  config: ResolvedHowlConfig;

  /** Access the logger instance directly. */
  get logger(): HowlLogger | null {
    return this.#logger;
  }

  /** Create a new Howl application. */
  constructor(options: HowlOptions = {}) {
    this.config = {
      root: ".",
      basePath: options.basePath ?? "",
      mode: options.mode ?? "production",
    };

    if (options.logger) {
      this.#logger = new HowlLogger({
        debug: options.debug,
        ...options.loggerOptions,
      });
      this.#logger.install();
    }
  }

  /**
   * Configure the app with a callback.
   * Useful for modular setup.
   *
   * @example
   * app.configure((app) => {
   *   app.use(staticFiles());
   *   app.use(authMiddleware);
   * });
   */
  configure(fn: (app: this) => void): this {
    fn(this);
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
  /** Register middleware scoped to a path pattern. */
  use(path: string, ...middleware: MaybeLazyMiddleware<State>[]): this;
  use(
    pathOrMiddleware: string | MaybeLazyMiddleware<State>,
    ...middlewares: MaybeLazyMiddleware<State>[]
  ): this {
    let pattern: string;
    let fns: MaybeLazyMiddleware<State>[];
    if (typeof pathOrMiddleware === "string") {
      pattern = pathOrMiddleware;
      fns = middlewares!;
    } else {
      pattern = "*";
      middlewares.unshift(pathOrMiddleware);
      fns = middlewares;
    }
    // Trailing /* and /** collapse to the parent segment so the middleware
    // attaches one level up and propagates to every descendant route via the
    // segment-walk in segmentToMiddlewares. Bare "*" / "/*" stay as-is and
    // map to the root segment.
    if (pattern.length > 2 && (pattern.endsWith("/*") || pattern.endsWith("/**"))) {
      pattern = pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern.slice(0, -2);
      if (pattern === "") pattern = "/";
    }
    this.#commands.push(newMiddlewareCmd(pattern, fns, true));
    return this;
  }

  /** Set a custom 404 handler. */
  notFound(routeOrMiddleware: Route<State> | Middleware<State>): this {
    this.#commands.push(newNotFoundCmd(routeOrMiddleware));
    return this;
  }

  /** Set an error handler at a specific path. */
  onError(
    path: string,
    routeOrMiddleware: Route<State> | Middleware<State>,
  ): this {
    this.#commands.push(newErrorCmd(path, routeOrMiddleware, true));
    return this;
  }

  /** Set the outermost app wrapper component. */
  appWrapper(component: RouteComponent<State>): this {
    this.#commands.push(newAppCmd(component));
    return this;
  }

  /** Add a layout component at a path. */
  layout(
    path: string,
    component: RouteComponent<State>,
    config?: LayoutConfig,
  ): this {
    this.#commands.push(newLayoutCmd(path, component, config, true));
    return this;
  }

  /** Add a route with optional config. */
  route(
    path: string,
    route: MaybeLazy<Route<State>>,
    config?: RouteConfig,
  ): this {
    this.#commands.push(newRouteCmd(path, route, config, false));
    return this;
  }

  /** Add a GET handler. */
  get(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("GET", path, middlewares, false));
    return this;
  }

  /** Add a POST handler. */
  post(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("POST", path, middlewares, false));
    return this;
  }

  /** Add a PATCH handler. */
  patch(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("PATCH", path, middlewares, false));
    return this;
  }

  /** Add a PUT handler. */
  put(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("PUT", path, middlewares, false));
    return this;
  }

  /** Add a DELETE handler. */
  delete(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("DELETE", path, middlewares, false));
    return this;
  }

  /** Add a HEAD handler. */
  head(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("HEAD", path, middlewares, false));
    return this;
  }

  /** Add a handler for all HTTP verbs. */
  all(path: string, ...middlewares: MaybeLazy<Middleware<State>>[]): this {
    this.#commands.push(newHandlerCmd("ALL", path, middlewares, false));
    return this;
  }

  /**
   * Insert file-system routes collected by the Builder.
   *
   * @example
   * app.fsClientRoutes();
   */
  fsClientRoutes(pattern = "*"): this {
    this.#commands.push({
      type: CommandType.FsRoute,
      pattern,
      getItems: () => {
        const buildCache = this.#getBuildCache();
        if (buildCache === null) return [];
        return buildCache.getFsRoutes();
      },
      includeLastSegment: false,
    });
    return this;
  }

  /**
   * Enable API routes from the apis/ directory.
   * HowlBuilder crawls apis/ at startup and registers all .api.ts files.
   *
   * Convention: place API definitions in apis/**\/*.api.ts
   *
   * @example
   * import { apiConfig } from "./howl.config.ts";
   * app.fsApiRoutes(apiConfig);
   */
  // deno-lint-ignore no-explicit-any
  fsApiRoutes(config?: any): this {
    this.#apiRoutesEnabled = true;
    if (config !== undefined) this.#apiConfig = config;
    const cmd: ApiRouteCommand<State> = { type: CommandType.ApiRoute, getItems: () => [] };
    this.#apiRouteCmd = cmd;
    this.#commands.push(cmd);
    return this;
  }

  /** @internal — used by HowlBuilder */
  isApiRoutesEnabled(): boolean {
    return this.#apiRoutesEnabled;
  }

  /** @internal — used by HowlBuilder */
  // deno-lint-ignore no-explicit-any
  getApiConfig(): any {
    return this.#apiConfig;
  }

  /** @internal — used by HowlBuilder to populate the ApiRouteCommand at its registered position */
  setApiRouteItems(items: Command<State>[]): void {
    if (this.#apiRouteCmd !== null) {
      this.#apiRouteCmd.getItems = () => items;
    }
  }

  /**
   * Merge another Howl instance into this app at the specified path.
   */
  mountApp(path: string, app: Howl<State>): this {
    for (let i = 0; i < app.#commands.length; i++) {
      const cmd = app.#commands[i];
      if (
        cmd.type !== CommandType.App &&
        cmd.type !== CommandType.NotFound &&
        cmd.type !== CommandType.ApiRoute
      ) {
        let effectivePattern = cmd.pattern;
        if (app.config.basePath) {
          effectivePattern = mergePath(app.config.basePath, cmd.pattern, false);
        }
        const clone = {
          ...cmd,
          pattern: mergePath(path, effectivePattern, true),
          includeLastSegment: cmd.pattern === "/" || cmd.includeLastSegment,
        };
        this.#commands.push(clone);
        continue;
      }
      this.#commands.push(cmd);
    }

    // deno-lint-ignore no-this-alias
    const self = this;
    app.#getBuildCache = () => self.#getBuildCache();
    return this;
  }

  /**
   * Create a handler function for `Deno.serve` or testing.
   */
  handler(): (
    request: Request,
    info?: Deno.ServeHandlerInfo,
  ) => Promise<Response> {
    let buildCache = this.#getBuildCache();
    if (buildCache === null) {
      if (this.config.mode === "production" && DENO_DEPLOYMENT_ID !== undefined) {
        throw new Error(
          `Could not find _howl directory. Did you forget to run "deno task build"?`,
        );
      } else {
        buildCache = new MockBuildCache([], this.config.mode);
      }
    }

    const router = new UrlPatternRouter<MaybeLazyMiddleware<State>>();
    const { rootMiddlewares } = applyCommands(
      router,
      this.#commands,
      this.config.basePath,
    );

    return async (
      req: Request,
      conn: Deno.ServeHandlerInfo = DEFAULT_CONN_INFO,
    ) => {
      const url = new URL(req.url);
      url.pathname = url.pathname.replace(/\/+/g, "/");

      const method = req.method.toUpperCase() as Method;
      const matched = router.match(method, url);
      let { params, pattern, handlers, methodMatch } = matched;

      const span = trace.getActiveSpan();
      if (span && pattern) {
        span.updateName(`${method} ${pattern}`);
        span.setAttribute("http.route", pattern);
      }

      let next: () => Promise<Response>;
      if (pattern === null || !methodMatch) {
        handlers = rootMiddlewares;
      }

      if (matched.pattern !== null && !methodMatch) {
        if (method === "OPTIONS") {
          const allowed = router.getAllowedMethods(matched.pattern);
          next = defaultOptionsHandler(allowed);
        } else {
          next = DEFAULT_NOT_ALLOWED_METHOD;
        }
      } else {
        next = DEFAULT_NOT_FOUND;
      }

      const ctx = new Context<State>(
        req,
        url,
        conn,
        matched.pattern,
        params,
        this.config,
        next,
        buildCache!,
        new Headers(), // response headers instance
      );

      try {
        if (handlers.length === 0) return await next();
        const result = await runMiddlewares(handlers, ctx, this.#onError);
        if (!(result instanceof Response)) {
          throw new Error(
            `Expected a "Response" instance, but got: ${result}`,
          );
        }
        if (method === "HEAD") return new Response(null, result);
        return result;
      } catch (err) {
        ctx.error = err;
        return await DEFAULT_ERROR_HANDLER(ctx);
      }
    };
  }

  /**
   * Start the server.
   *
   * @example
   * await app.listen({ port: 8000 });
   */
  listen(options: ListenOptions = {}): void {
    if (!options.onListen) {
      options.onListen = createOnListen(this.config.basePath, options);
    }
    const handler = this.handler();
    if (options.port) {
      Deno.serve(options, handler);
      return;
    }
    listenOnFreePort(options, handler);
  }

  /**
   * Returns registered client configs.
   * Used internally by HowlBuilder.
   */
  getClients(): ClientConfig[] {
    return this.#clients;
  }

  /**
   * Register a client app.
   * Each client is an isolated island/route build mounted at a path.
   *
   * @example
   * app.client({ name: "main", dir: "./apps/main", mount: "/" });
   */
  client(config: ClientConfig): this {
    this.#clients.push(config);
    return this;
  }
}

/**
 * @deprecated Use {@linkcode Howl} directly.
 * App is kept as an internal alias for backward compatibility.
 */
export { Howl as App };
