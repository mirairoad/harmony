// deno-lint-ignore-file no-explicit-any
import type { Context } from "../core/context.ts";
import type { Howl } from "../core/app.ts";
import type { AnyApiDefinition, CacheAdapter, HowlApiConfig } from "./types.ts";
import { HttpError } from "./errors.ts";

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
) {
  return async (ctx: Context<State>): Promise<Response> => {
    const { name, directory, handler, roles, caching, redirectOnFailure } = api;
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

      // --- Cache read ---
      if (ttl > 0) {
        const cacheKey = buildCacheKey(ctx, protectedRoute);
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
                  return (target.state as any).__body ?? null;
                }
                return (reqTarget as any)[reqProp];
              },
            });
          }
          if (prop === "query" && (target.state as any).__query !== undefined) {
            return (key?: string) => {
              const q = (target.state as any).__query;
              return key !== undefined ? q[key] : q;
            };
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
      if (ttl > 0) {
        const cacheKey = buildCacheKey(ctx, protectedRoute);
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
      if (redirectOnFailure) {
        return ctx.redirect(redirectOnFailure, 302);
      }

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
