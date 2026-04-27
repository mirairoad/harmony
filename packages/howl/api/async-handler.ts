import type { Context } from "../core/context.ts";
import type { Howl } from "../core/app.ts";
import type { AnyApiDefinition, CacheAdapter, HowlApiConfig, RateLimitConfig } from "./types.ts";
import { HttpError, isHttpError } from "../core/error.ts";
import { getApiRequestState } from "./_request_state.ts";

// Helpers below operate on `Context<any>` because they read/inspect generic
// state slots that any user app might define. The `any` is contained — the
// outer pipeline preserves typed `Context<State>`.
// deno-lint-ignore no-explicit-any
type AnyCtx = Context<any>;
// deno-lint-ignore no-explicit-any
type AnyApiConfig = HowlApiConfig<any, any> | null;

function getClientIp(ctx: AnyCtx): string {
  return ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    ctx.req.headers.get("x-real-ip") ??
    (ctx.info.remoteAddr as Deno.NetAddr).hostname ??
    "unknown";
}

function resolveIdentifier(ctx: AnyCtx, howlConfig: AnyApiConfig): string | undefined {
  return howlConfig?.getRateLimitIdentifier?.(ctx);
}

async function nonAtomicIncr(
  cache: CacheAdapter,
  key: string,
  ttlSeconds: number,
): Promise<number> {
  const raw = await cache.get(key);
  const next = (raw ? Number(raw) : 0) + 1;
  await cache.set(key, String(next), ttlSeconds);
  return next;
}

async function checkRateLimit(
  ctx: AnyCtx,
  cache: CacheAdapter,
  rl: RateLimitConfig,
  howlConfig: AnyApiConfig,
): Promise<Response | null> {
  const identifier = resolveIdentifier(ctx, howlConfig) ?? getClientIp(ctx);
  const baseKey = `ratelimit:${identifier}:${ctx.req.method}:${ctx.url.pathname}`;
  const cntKey = `${baseKey}:cnt`;
  const blkKey = `${baseKey}:blk`;
  const now = Date.now();

  const blocked = await cache.get(blkKey);
  if (blocked) {
    const blockedUntil = Number(blocked);
    if (blockedUntil > now) {
      const retryAfter = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
      ctx.headers.set("Retry-After", String(retryAfter));
      ctx.headers.set("X-RateLimit-Limit", String(rl.max));
      ctx.headers.set("X-RateLimit-Remaining", "0");
      return ctx.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const incr = cache.incr ?? nonAtomicIncr.bind(null, cache);
  const ttlSeconds = Math.ceil(rl.windowMs / 1000);
  const count = await incr(cntKey, ttlSeconds);

  if (count > rl.max) {
    if (rl.blockDurationMs) {
      const blockedUntil = now + rl.blockDurationMs;
      await cache.set(blkKey, String(blockedUntil), Math.ceil(rl.blockDurationMs / 1000));
      ctx.headers.set("Retry-After", String(Math.ceil(rl.blockDurationMs / 1000)));
    } else {
      ctx.headers.set("Retry-After", String(ttlSeconds));
    }
    ctx.headers.set("X-RateLimit-Limit", String(rl.max));
    ctx.headers.set("X-RateLimit-Remaining", "0");
    return ctx.json({ error: "Too many requests" }, { status: 429 });
  }

  ctx.headers.set("X-RateLimit-Limit", String(rl.max));
  ctx.headers.set("X-RateLimit-Remaining", String(Math.max(0, rl.max - count)));
  return null;
}

function buildCacheKey(ctx: AnyCtx, perUser: boolean, howlConfig: AnyApiConfig): string {
  const base = `${ctx.req.method}:${ctx.url.pathname}${ctx.url.search}`;
  if (!perUser) return base;
  const id = resolveIdentifier(ctx, howlConfig) ?? "anonymous";
  return `${base}:${id}`;
}

interface ApiHandlerError {
  message?: string;
  status?: number;
}

interface PaginatedResponse {
  meta_pagination?: unknown;
}

/**
 * Build a child context that exposes the parsed body on `ctx.req.body` and a
 * typed `ctx.query()` reading from the WeakMap state. Uses `Object.create`
 * (not `Proxy`) so property access stays on the fast path.
 */
function makeApiCtx<State>(ctx: Context<State>): Context<State> {
  const apiState = getApiRequestState(ctx);
  const reqWithBody: Request = Object.create(ctx.req);
  Object.defineProperty(reqWithBody, "body", {
    value: apiState.body ?? null,
    enumerable: true,
  });
  const child: Context<State> = Object.create(ctx);
  Object.defineProperty(child, "req", {
    value: reqWithBody,
    enumerable: true,
  });
  if (apiState.query !== undefined) {
    const q = apiState.query as Record<string, unknown>;
    Object.defineProperty(child, "query", {
      value: (key?: string) => key !== undefined ? q[key] : q,
      enumerable: true,
    });
  }
  return child;
}

/**
 * Core API execution pipeline.
 * Handles: auth, caching, handler execution, response formatting, errors.
 */
export function asyncHandler<State, Role extends string>(
  app: Howl<State>,
  api: AnyApiDefinition,
  howlConfig: HowlApiConfig<State, Role> | null,
  cache: CacheAdapter,
  rateLimitCache: CacheAdapter,
): (ctx: Context<State>) => Promise<Response> {
  return async (ctx: Context<State>): Promise<Response> => {
    const { name, directory, handler, roles, caching } = api;
    const ttl = caching?.ttl ?? 0;
    const protectedRoute = roles.length > 0;

    try {
      if (protectedRoute) {
        if (!howlConfig?.checkPermissionStrategy) {
          // deno-lint-ignore no-console
          console.warn(
            `🐺 "${name}" requires roles ${
              JSON.stringify(roles)
            } but no checkPermissionStrategy is configured. Pass checkPermissionStrategy to app.fsApiRoutes(). Request will proceed without auth.`,
          );
        } else {
          const result = await howlConfig.checkPermissionStrategy(ctx, roles as Role[]);
          if (result instanceof Response) return result;
        }
      }

      if (api.rateLimit !== false) {
        const rl = api.rateLimit ?? howlConfig?.defaultRateLimit;
        if (rl) {
          const limited = await checkRateLimit(ctx, rateLimitCache, rl, howlConfig);
          if (limited) return limited;
        }
      }

      const cacheKey = ttl > 0 ? buildCacheKey(ctx, protectedRoute, howlConfig) : null;
      if (cacheKey) {
        const cached = await cache.get(cacheKey);
        if (cached) {
          return ctx.json(
            { ok: true, data: JSON.parse(cached) },
            { status: 200 },
          );
        }
      }

      const handlerCtx = makeApiCtx(ctx);

      type HandlerFn = (ctx: Context<State>, app: Howl<State>) => unknown;
      let response: unknown;
      try {
        response = await Promise.resolve((handler as HandlerFn)(handlerCtx, app));
      } catch (innerErr) {
        if (isHttpError(innerErr)) throw innerErr;
        // Re-wrap arbitrary errors so the outer catch's status read is
        // consistent. Preserve a numeric `status`/`statusCode` hint if the
        // underlying error carried one — `statusCode` is honoured for
        // backwards compatibility with older user code.
        const e = innerErr as
          | { message?: unknown; status?: unknown; statusCode?: unknown }
          | undefined;
        const msg = typeof e?.message === "string"
          ? e.message
          : String(innerErr ?? "Unknown error");
        const wrapped = new Error(msg) as Error & { status?: number };
        const hint = typeof e?.status === "number"
          ? e.status
          : typeof e?.statusCode === "number"
          ? e.statusCode
          : undefined;
        if (hint !== undefined) wrapped.status = hint;
        throw wrapped;
      }

      if (response instanceof Response) return response;

      const respObj = (response ?? {}) as
        & Record<string, unknown>
        & { statusCode?: number };
      const location = (respObj.headers as Headers | undefined)?.get?.("location");
      if (location) {
        return ctx.redirect(location, respObj.statusCode ?? 302);
      }

      const statusCode = respObj.statusCode ?? 200;
      const { statusCode: _sc, ok: _ok, ...data } = respObj;

      if (cacheKey) {
        await cache.set(cacheKey, JSON.stringify(data), ttl);
      }

      if (statusCode === 204) {
        return new Response(null, { status: 204, headers: ctx.headers });
      }

      const meta = (response as PaginatedResponse | null)?.meta_pagination;
      return ctx.json(
        meta !== undefined ? { ok: true, data, meta_pagination: meta } : { ok: true, data },
        { status: statusCode },
      );
    } catch (err) {
      const e = err as ApiHandlerError | undefined;
      const statusCode = typeof e?.status === "number" ? e.status : 500;
      const errorMessage = typeof e?.message === "string"
        ? e.message
        : "Something went wrong, try again.";

      const correlationId = crypto.randomUUID();
      const service =
        `DIR_${directory.toLowerCase()}_NAME_${name.toLowerCase()}_METHOD_${ctx.req.method.toLowerCase()}`;

      // deno-lint-ignore no-console
      console.error(`[${correlationId}] ${service}\t${errorMessage}`);

      ctx.headers.set("X-Howl-Correlation-Id", correlationId);
      return ctx.json(
        { error: errorMessage, correlationId },
        { status: statusCode },
      );
    }
  };
}
