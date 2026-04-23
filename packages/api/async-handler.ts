// deno-lint-ignore-file no-explicit-any
import type { Context } from "../core/context.ts";
import type { Howl } from "../core/app.ts";
import type { AnyApiDefinition, CacheAdapter, HowlApiConfig, RateLimitConfig } from "./types.ts";
import { HttpError } from "./errors.ts";
import { getApiRequestState } from "./_request_state.ts";

function getClientIp(ctx: Context<any>): string {
  return ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? ctx.req.headers.get("x-real-ip")
    ?? (ctx.info.remoteAddr as Deno.NetAddr).hostname
    ?? "unknown";
}

async function checkRateLimit(
  ctx: Context<any>,
  cache: CacheAdapter,
  rl: RateLimitConfig,
): Promise<Response | null> {
  const userId = (ctx.state as any)?.userContext?.id;
  const identifier = userId ?? getClientIp(ctx);
  const key = `ratelimit:${identifier}:${ctx.req.method}:${ctx.url.pathname}`;
  const now = Date.now();

  const raw = await cache.get(key);
  const stored: { count: number; resetAt: number; blockedUntil?: number } | null = raw
    ? JSON.parse(raw)
    : null;
  // Keep entry if window is active OR an extended block is still in effect
  const current = stored &&
      (stored.resetAt > now || (stored.blockedUntil && stored.blockedUntil > now))
    ? stored
    : null;

  if (current && current.count >= rl.max) {
    let blockedUntil = current.blockedUntil;
    // First time hitting the limit with a configured block duration — persist the extended lockout
    if (!blockedUntil && rl.blockDurationMs) {
      blockedUntil = now + rl.blockDurationMs;
      await cache.set(
        key,
        JSON.stringify({ ...current, blockedUntil }),
        Math.ceil(rl.blockDurationMs / 1000),
      );
    }
    const expiresAt = blockedUntil ?? current.resetAt;
    const retryAfter = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    ctx.headers.set("Retry-After", String(retryAfter));
    ctx.headers.set("X-RateLimit-Limit", String(rl.max));
    ctx.headers.set("X-RateLimit-Remaining", "0");
    return ctx.json({ error: "Too many requests" }, { status: 429 });
  }

  const newCount = (current?.count ?? 0) + 1;
  const resetAt = current?.resetAt ?? now + rl.windowMs;
  const ttlMs = Math.max(0, resetAt - now);
  await cache.set(key, JSON.stringify({ count: newCount, resetAt }), Math.ceil(ttlMs / 1000));

  ctx.headers.set("X-RateLimit-Limit", String(rl.max));
  ctx.headers.set("X-RateLimit-Remaining", String(Math.max(0, rl.max - newCount)));
  return null;
}

function redactPasswords(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redactPasswords);
  if (typeof obj === "object") {
    const out: any = {};
    for (const key in obj) {
      out[key] = key.toLowerCase() === "password" ? "[redacted]" : redactPasswords(obj[key]);
    }
    return out;
  }
  return obj;
}

function buildCacheKey(ctx: Context<any>, perUser: boolean): string {
  const base = `${ctx.req.method}:${ctx.req.url}`;
  if (!perUser) return base;
  const userId = (ctx.state as any)?.userContext?.id ?? "anonymous";
  return `${base}:${userId}`;
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
) {
  return async (ctx: Context<State>): Promise<Response> => {
    const { name, directory, handler, roles, caching } = api;
    const ttl = caching?.ttl ?? 0;
    const protectedRoute = roles.length > 0;

    try {
      // --- Auth check — delegate to checkPermissionStrategy ---
      if (protectedRoute) {
        if (!howlConfig?.checkPermissionStrategy) {
          // deno-lint-ignore no-console
          console.warn(
            `🐺 "${name}" requires roles ${JSON.stringify(roles)} but no checkPermissionStrategy is configured. Pass checkPermissionStrategy to app.fsApiRoutes(). Request will proceed without auth.`,
          );
        } else {
          const result = await howlConfig.checkPermissionStrategy(ctx, roles as Role[]);
          if (result instanceof Response) return result;
        }
      }

      // --- Rate limit ---
      if (api.rateLimit !== false) {
        const rl = api.rateLimit ?? howlConfig?.defaultRateLimit;
        if (rl) {
          const limited = await checkRateLimit(ctx, rateLimitCache, rl);
          if (limited) return limited;
        }
      }

      // --- Cache read ---
      const cacheKey = ttl > 0 ? buildCacheKey(ctx, protectedRoute) : null;
      if (cacheKey) {
        const cached = await cache.get(cacheKey);
        if (cached) {
          return ctx.json(
            { ok: true, data: JSON.parse(cached) },
            { status: 200 },
          );
        }
      }

      // --- Proxy — exposes ctx.req.body and ctx.query() typed from Zod schemas ---
      const ctxWithBody = new Proxy(ctx, {
        get(target, prop) {
          if (prop === "req") {
            return new Proxy(target.req, {
              get(reqTarget, reqProp) {
                if (reqProp === "body") {
                  return getApiRequestState(target).body ?? null;
                }
                return (reqTarget as any)[reqProp];
              },
            });
          }
          if (prop === "query") {
            const q = getApiRequestState(target).query;
            if (q !== undefined) {
              return (key?: string) => key !== undefined ? (q as any)[key] : q;
            }
          }
          const value = (target as any)[prop];
          return typeof value === "function" ? value.bind(target) : value;
        },
      });

      // --- Execute handler ---
      let response: any;
      try {
        response = await Promise.resolve(
          (handler as any)(ctxWithBody, app),
        );
      } catch (innerErr: any) {
        if (innerErr instanceof HttpError) throw innerErr;
        const msg = typeof innerErr?.message === "string"
          ? innerErr.message
          : String(innerErr ?? "Unknown error");
        const err = new Error(msg);
        const status = innerErr?.statusCode ?? innerErr?.status;
        if (typeof status === "number") (err as any).statusCode = status;
        throw err;
      }

      // --- Raw Response passthrough ---
      if (response instanceof Response) return response;

      // --- Redirect passthrough ---
      const location = response?.headers?.get?.("location");
      if (location) return ctx.redirect(location, response.status);

      // --- Format response ---
      const statusCode = response?.statusCode ?? 200;
      const { statusCode: _sc, ok: _ok, ...rest } = response as any;
      let data = rest?.data !== undefined ? rest.data : rest;

      data = redactPasswords(data);

      // --- Cache write ---
      if (cacheKey) {
        await cache.set(cacheKey, JSON.stringify(data), ttl);
      }

      // --- Special response types ---
      if (data?.html) {
        return ctx.html(data.html, { status: statusCode });
      }

      if (statusCode === 204) {
        return new Response(null, { status: 204, headers: ctx.headers });
      }

      return ctx.json(
        {
          ok: true,
          data,
          ...(response?.meta_pagination ? { meta_pagination: response.meta_pagination } : {}),
        },
        { status: statusCode },
      );
    } catch (err: any) {
      const statusCode = err?.statusCode ?? err?.status ?? 500;
      const errorMessage = typeof err?.message === "string"
        ? err.message
        : "Something went wrong, try again.";

      const service =
        `DIR_${directory.toLowerCase()}_NAME_${name.toLowerCase()}_METHOD_${ctx.req.method.toLowerCase()}`;

      // deno-lint-ignore no-console
      console.error(`${service}\t${errorMessage}`);

      return ctx.json(
        { service, error: errorMessage },
        { status: statusCode },
      );
    }
  };
}
