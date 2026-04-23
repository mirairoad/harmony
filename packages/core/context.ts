import {
  type AnyComponent,
  type ComponentType,
  Fragment,
  type FunctionComponent,
  h,
  isValidElement,
  type VNode,
} from "preact";
import { jsxTemplate } from "preact/jsx-runtime";
import { SpanStatusCode } from "@opentelemetry/api";
import type { ResolvedHowlConfig } from "./config.ts";
import type { BuildCache } from "./build_cache.ts";
import type { LayoutConfig } from "./types.ts";
import { FreshScripts, RenderState, setRenderState } from "./runtime/server/preact_hooks.ts";
import { DEV_ERROR_OVERLAY_URL, PARTIAL_SEARCH_PARAM } from "./constants.ts";
import { tracer } from "./otel.ts";
import {
  type ComponentDef,
  isAsyncAnyComponent,
  type PageProps,
  renderAsyncAnyComponent,
  renderRouteComponent,
} from "./render.ts";
import { renderToString } from "preact-render-to-string";
import { CookieManager } from "./cookies.ts";

const ENCODER = new TextEncoder();

export interface SSEEvent {
  data: unknown;
  event?: string;
  id?: string | number;
  /** Reconnection delay hint in milliseconds. */
  retry?: number;
}

export interface Island {
  file: string;
  name: string;
  exportName: string;
  fn: ComponentType;
  css: string[];
  /** Skip SSR for this island. Set via `export const howl = { ssr: false }` in the island file. */
  ssr: boolean;
}

export type ServerIslandRegistry = Map<ComponentType, Island>;

export const internals: unique symbol = Symbol("fresh_internal");

export interface UiTree<Data, State> {
  app: AnyComponent<PageProps<Data, State>> | null;
  layouts: ComponentDef<Data, State>[];
}

/**
 * @deprecated Use {@linkcode Context} instead.
 */
export type FreshContext<State = unknown> = Context<State>;

export let getBuildCache: <T>(ctx: Context<T>) => BuildCache<T>;
export let getInternals: <T>(ctx: Context<T>) => UiTree<unknown, T>;
export let setAdditionalStyles: <T>(ctx: Context<T>, css: string[]) => void;

/**
 * The context passed to every middleware. It is unique for every request.
 */
export class Context<State> {
  #internal: UiTree<unknown, State> = {
    app: null,
    layouts: [],
  };

  /** Reference to the resolved Fresh configuration */
  readonly config: ResolvedHowlConfig;
  /**
   * The request url parsed into an `URL` instance. This is typically used
   * to apply logic based on the pathname of the incoming url or when
   * certain search parameters are set.
   */
  readonly url: URL;
  /** The original incoming {@linkcode Request} object. */
  readonly req: Request;
  /** The matched route pattern. */
  readonly route: string | null;
  /** The url parameters of the matched route pattern. */
  readonly params: Record<string, string>;
  /** State object that is shared with all middlewares. */
  readonly state: State = {} as State;
  data: unknown = undefined;
  /** Error value if an error was caught (Default: null) */
  error: unknown | null = null;
  readonly info: Deno.ServeHandlerInfo;
  /**
   * Whether the current Request is a partial request.
   *
   * Partials in Fresh will append the query parameter
   * {@linkcode PARTIAL_SEARCH_PARAM} to the URL. This property can
   * be used to determine if only `<Partial>`'s need to be rendered.
   */
  readonly isPartial: boolean;

  /**
   * Call the next middleware.
   * ```ts
   * const myMiddleware: Middleware = (ctx) => {
   *   // do something
   *
   *   // Call the next middleware
   *   return ctx.next();
   * }
   *
   * const myMiddleware2: Middleware = async (ctx) => {
   *   // do something before the next middleware
   *   doSomething()
   *
   *   const res = await ctx.next();
   *
   *   // do something after the middleware
   *   doSomethingAfter()
   *
   *   // Return the `Response`
   *   return res
   * }
   */
  next: () => Promise<Response>;

  #buildCache: BuildCache<State>;
  #additionalStyles: string[] | null = null;

  Component!: FunctionComponent;

  static {
    // deno-lint-ignore no-explicit-any
    getInternals = <T>(ctx: Context<T>) => ctx.#internal as any;
    getBuildCache = <T>(ctx: Context<T>) => ctx.#buildCache;
    setAdditionalStyles = <T>(ctx: Context<T>, css: string[]) => ctx.#additionalStyles = css;
  }

  constructor(
    req: Request,
    url: URL,
    info: Deno.ServeHandlerInfo,
    route: string | null,
    params: Record<string, string>,
    config: ResolvedHowlConfig,
    next: () => Promise<Response>,
    buildCache: BuildCache<State>,
    headers: Headers,
  ) {
    this.url = url;
    this.req = req;
    this.info = info;
    this.params = params;
    this.route = route;
    this.config = config;
    this.isPartial = url.searchParams.has(PARTIAL_SEARCH_PARAM);
    this.next = next;
    this.#buildCache = buildCache;
    this.headers = headers; // ← before cookies
    this.cookies = new CookieManager(req.headers, this.headers); // ← after headers
  }

  /**
   * Mutable response headers — automatically merged into all responses.
   * Use this to set headers that persist across the request lifecycle.
   *
   * @example
   * ctx.headers.set("X-Request-Id", crypto.randomUUID());
   * ctx.headers.append("Vary", "Accept-Encoding");
   */
  readonly headers: Headers;

  /**
   * First-class cookie manager.
   * Reads from request, writes to response headers with correct append semantics.
   *
   * @example
   * ctx.cookies.set("token", jwt, { httpOnly: true });
   * const token = ctx.cookies.get("token");
   * ctx.cookies.delete("session");
   */
  readonly cookies: CookieManager;

  /**
   * Return a redirect response to the specified path. This is the
   * preferred way to do redirects in Fresh.
   *
   * ```ts
   * ctx.redirect("/foo/bar") // redirect user to "<yoursite>/foo/bar"
   *
   * // Disallows protocol relative URLs for improved security. This
   * // redirects the user to `<yoursite>/evil.com` which is safe,
   * // instead of redirecting to `http://evil.com`.
   * ctx.redirect("//evil.com/");
   * ```
   */
  redirect(pathOrUrl: string, status = 302): Response {
    let location = pathOrUrl;

    // Disallow protocol relative URLs
    if (pathOrUrl !== "/" && pathOrUrl.startsWith("/")) {
      let idx = pathOrUrl.indexOf("?");
      if (idx === -1) {
        idx = pathOrUrl.indexOf("#");
      }

      const pathname = idx > -1 ? pathOrUrl.slice(0, idx) : pathOrUrl;
      const search = idx > -1 ? pathOrUrl.slice(idx) : "";

      // Remove double slashes to prevent open redirect vulnerability.
      location = `${pathname.replaceAll(/\/+/g, "/")}${search}`;
    }

    const headers = new Headers({ location });

    // Merge ctx.headers into redirect response — cookies and headers set in
    // middleware are automatically included (same behaviour as ctx.render())
    this.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        headers.append(key, value);
      } else {
        headers.set(key, value);
      }
    });

    return new Response(null, { status, headers });
  }

  /**
   * Redirect the user, automatically preserving the partial navigation
   * search parameter when the current request is a partial request.
   *
   * Use this in middleware guards instead of manually threading
   * `?howl-partial=true` — it handles that for you.
   *
   * ```ts
   * // Before
   * return ctx.redirect(`/sign-in${ctx.isPartial ? '?howl-partial=true' : ''}`);
   *
   * // After
   * return ctx.partialRedirect('/sign-in');
   * ```
   */
  partialRedirect(pathOrUrl: string, status = 302): Response {
    if (this.isPartial) {
      const hasQuery = pathOrUrl.includes("?");
      pathOrUrl = `${pathOrUrl}${hasQuery ? "&" : "?"}${PARTIAL_SEARCH_PARAM}=true`;
    }
    return this.redirect(pathOrUrl, status);
  }

  /**
   * Render JSX and return an HTML `Response` instance.
   * ```tsx
   * ctx.render(<h1>hello world</h1>);
   * ```
   */
  async render(
    // deno-lint-ignore no-explicit-any
    vnode: VNode<any> | null,
    init: ResponseInit | undefined = {},
    config: LayoutConfig = {},
  ): Promise<Response> {
    if (arguments.length === 0) {
      throw new Error(`No arguments passed to: ctx.render()`);
    } else if (vnode !== null && !isValidElement(vnode)) {
      throw new Error(`Non-JSX element passed to: ctx.render()`);
    }

    const defs = config.skipInheritedLayouts ? [] : this.#internal.layouts;
    const appDef = config.skipAppWrapper ? null : this.#internal.app;
    const props = this as Context<State>;

    // Compose final vnode tree
    for (let i = defs.length - 1; i >= 0; i--) {
      const child = vnode;
      props.Component = () => child;

      const def = defs[i];

      const result = await renderRouteComponent(this, def, () => child);
      if (result instanceof Response) {
        return result;
      }

      vnode = result;
    }

    let appChild = vnode;
    // deno-lint-ignore no-explicit-any
    let appVNode: VNode<any>;

    let hasApp = true;

    if (isAsyncAnyComponent(appDef)) {
      props.Component = () => appChild;
      const result = await renderAsyncAnyComponent(appDef, props);
      if (result instanceof Response) {
        return result;
      }

      appVNode = result;
    } else if (appDef !== null) {
      appVNode = h(appDef, {
        Component: () => appChild,
        config: this.config,
        data: null,
        error: this.error,
        info: this.info,
        isPartial: this.isPartial,
        params: this.params,
        req: this.req,
        state: this.state,
        url: this.url,
        route: this.route,
      });
    } else {
      hasApp = false;
      appVNode = appChild ?? h(Fragment, null);
    }

    const headers = getHeadersFromInit(init);
    headers.set("Content-Type", "text/html; charset=utf-8");

    // Merge ctx.headers into render response — cookies and headers set in
    // middleware are automatically included in the page response
    this.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        headers.append(key, value);
      } else {
        headers.set(key, value);
      }
    });

    const responseInit: ResponseInit = {
      status: init.status ?? 200,
      headers,
      statusText: init.statusText,
    };

    let partialId = "";
    if (this.url.searchParams.has(PARTIAL_SEARCH_PARAM)) {
      partialId = crypto.randomUUID();
      headers.set("X-Fresh-Id", partialId);
    }

    const html = tracer.startActiveSpan("render", (span) => {
      span.setAttribute("fresh.span_type", "render");
      const state = new RenderState(
        this,
        this.#buildCache,
        partialId,
      );

      if (this.#additionalStyles !== null) {
        for (let i = 0; i < this.#additionalStyles.length; i++) {
          const css = this.#additionalStyles[i];
          state.islandAssets.add(css);
        }
      }

      try {
        setRenderState(state);

        // Single-pass: render the full tree (app + layouts + page) in one call.
        // appVNode captures appChild by closure reference; since appChild = vnode
        // and is never reassigned, Preact walks the entire tree once and island
        // detection runs correctly before FreshScripts renders at end of <body>.
        let html = renderToString(
          hasApp ? appVNode : (vnode ?? h(Fragment, null)),
        );

        if (
          !state.renderedHtmlBody || !state.renderedHtmlHead ||
          !state.renderedHtmlTag
        ) {
          let fallback: VNode = jsxTemplate([html]);
          if (!state.renderedHtmlBody) {
            let scripts: VNode | null = null;

            if (
              this.url.pathname !== this.config.basePath + DEV_ERROR_OVERLAY_URL
            ) {
              scripts = h(FreshScripts, null) as VNode;
            }

            fallback = h("body", null, fallback, scripts);
          }
          if (!state.renderedHtmlHead) {
            fallback = h(
              Fragment,
              null,
              h("head", null, h("meta", { charset: "utf-8" })),
              fallback,
            );
          }
          if (!state.renderedHtmlTag) {
            fallback = h("html", null, fallback);
          }

          html = renderToString(fallback);
        }

        return `<!DOCTYPE html>${html}`;
      } catch (err) {
        if (err instanceof Error) {
          span.recordException(err);
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: String(err),
          });
        }
        throw err;
      } finally {
        // Add preload headers
        const basePath = this.config.basePath;
        const runtimeUrl = state.buildCache.clientEntry.startsWith(".")
          ? state.buildCache.clientEntry.slice(1)
          : state.buildCache.clientEntry;
        const linkParts: string[] = [
          `<${encodeURI(`${basePath}${runtimeUrl}`)}>; rel="modulepreload"; as="script"`,
        ];
        state.islands.forEach((island) => {
          const specifier = `${basePath}${
            island.file.startsWith(".") ? island.file.slice(1) : island.file
          }`;
          linkParts.push(`<${encodeURI(specifier)}>; rel="modulepreload"; as="script"`);
        });
        headers.append("Link", linkParts.join(", "));

        state.clear();
        setRenderState(null);

        span.end();
      }
    });
    return new Response(html, responseInit);
  }

  // Helper to merge ctx.headers into ResponseInit
  #mergeHeaders(init?: ResponseInit): ResponseInit {
    const merged = new Headers(this.headers);
    if (init?.headers) {
      const incoming = init.headers instanceof Headers
        ? init.headers
        : new Headers(init.headers as HeadersInit);
      for (const [key, value] of incoming.entries()) {
        // Set-Cookie must append, everything else can set
        if (key.toLowerCase() === "set-cookie") {
          merged.append(key, value);
        } else {
          merged.set(key, value);
        }
      }
    }
    return { ...init, headers: merged };
  }

  // Update json():
  json(content: any, init?: ResponseInit): Response {
    return Response.json(content, this.#mergeHeaders(init));
  }

  // Update text():
  text(content: string, init?: ResponseInit): Response {
    return new Response(content, this.#mergeHeaders(init));
  }

  // Update html():
  html(content: string, init?: ResponseInit): Response {
    const merged = this.#mergeHeaders(init);
    const headers = new Headers(merged.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new Response(content, { ...merged, headers });
  }

  /**
   * Stream Server-Sent Events.
   * Automatically sets `Content-Type: text/event-stream` and merges ctx.headers.
   *
   * ```ts
   * app.get("/events", (ctx) =>
   *   ctx.sse(async function* () {
   *     while (true) {
   *       yield { data: { time: Date.now() }, event: "tick" };
   *       await new Promise((r) => setTimeout(r, 1000));
   *     }
   *   })
   * );
   * ```
   */
  sse(
    stream:
      | AsyncIterable<SSEEvent>
      | (() => AsyncIterable<SSEEvent>),
    init?: ResponseInit,
  ): Response {
    const raw = typeof stream === "function" ? stream() : stream;

    const body = ReadableStream.from(raw).pipeThrough(
      new TransformStream<SSEEvent, Uint8Array>({
        transform(event, controller) {
          let msg = "";
          if (event.id !== undefined) msg += `id: ${event.id}\n`;
          if (event.event !== undefined) msg += `event: ${event.event}\n`;
          if (event.retry !== undefined) msg += `retry: ${event.retry}\n`;
          const data = typeof event.data === "string"
            ? event.data
            : JSON.stringify(event.data);
          msg += `data: ${data}\n\n`;
          controller.enqueue(ENCODER.encode(msg));
        },
      }),
    );

    const merged = this.#mergeHeaders(init);
    const headers = new Headers(merged.headers);
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");
    return new Response(body, { ...merged, headers });
  }

  /**
   * Helper to stream a sync or async iterable and encode text
   * automatically.
   *
   * ```tsx
   * function* gen() {
   *   yield "foo";
   *   yield "bar";
   * }
   *
   * app.use(ctx => ctx.stream(gen()))
   * ```
   *
   * Or pass in the function directly:
   *
   * ```tsx
   * app.use(ctx => {
   *   return ctx.stream(function* gen() {
   *     yield "foo";
   *     yield "bar";
   *   });
   * );
   * ```
   */
  stream<U extends string | Uint8Array>(
    stream:
      | Iterable<U>
      | AsyncIterable<U>
      | (() => Iterable<U> | AsyncIterable<U>),
    init?: ResponseInit,
  ): Response {
    const raw = typeof stream === "function" ? stream() : stream;

    const body = ReadableStream.from(raw)
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (chunk instanceof Uint8Array) {
              // deno-lint-ignore no-explicit-any
              controller.enqueue(chunk as any);
            } else if (chunk === undefined) {
              controller.enqueue(undefined);
            } else {
              const raw = ENCODER.encode(String(chunk));
              controller.enqueue(raw);
            }
          },
        }),
      );

    return new Response(body, this.#mergeHeaders(init));
  }
  /**
   * Get query parameters from the request URL.
   *
   * @example
   * const search = ctx.query("q");         // single param
   * const all = ctx.query();               // all params
   */
  query(): Record<string, string>;
  query(key: string): string | undefined;
  query(key?: string): Record<string, string> | string | undefined {
    if (key !== undefined) {
      return this.url.searchParams.get(key) ?? undefined;
    }
    const result: Record<string, string> = {};
    for (const [k, v] of this.url.searchParams.entries()) {
      result[k] = v;
    }
    return result;
  }
}

function getHeadersFromInit(init?: ResponseInit) {
  if (init === undefined) {
    return new Headers();
  }

  return init.headers !== undefined
    ? init.headers instanceof Headers ? init.headers : new Headers(init.headers)
    : new Headers();
}
