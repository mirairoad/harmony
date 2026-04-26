import type { Context } from "../core/context.ts";
import type { Howl } from "../core/app.ts";
import { z } from "zod";

/**
 * Cache adapter interface.
 * Implement this to plug in any cache backend.
 */
export interface CacheAdapter {
  /** Read the value at `key`, or `null` if missing/expired. */
  get(key: string): Promise<string | null>;
  /** Write `value` at `key` with a TTL in seconds. */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Remove the value at `key`. */
  delete(key: string): Promise<void>;
}

/**
 * Per-route or app-wide rate limit configuration.
 *
 * Counters are keyed on `userId` when authenticated, otherwise on the client
 * IP. Use `rateLimitCache` in {@linkcode HowlApiConfig} to share counters
 * across instances (Redis/Deno KV).
 */
export interface RateLimitConfig {
  /** Max requests allowed in the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /**
   * How long to lock out the identifier after hitting the limit.
   * Defaults to the remaining window time when omitted.
   * Use for sensitive endpoints (login, OTP, password reset) where
   * you want a lockout longer than the counting window.
   *
   * @example { max: 5, windowMs: 60_000, blockDurationMs: 3_600_000 }
   * // 5 attempts per minute → blocked for 1 hour if exceeded
   */
  blockDurationMs?: number;
}

/**
 * Howl API configuration — passed to app.fsApiRoutes().
 */
export interface HowlApiConfig<
  State = unknown,
  Role extends string = string,
> {
  /** Valid roles for this app — typed from your Role union */
  roles: readonly Role[];
  /**
   * Default rate limit applied to every endpoint.
   * Override per-route via `rateLimit` in defineApi.
   * Set `rateLimit: false` on a route to disable it entirely.
   */
  defaultRateLimit?: RateLimitConfig;
  /**
   * Auth middleware called before every role-protected endpoint.
   * Return a Response to deny access, return nothing to allow.
   *
   * @example
   * checkPermissionStrategy: (ctx, allowedRoles) => {
   *   const user = ctx.state.userContext?.user;
   *   if (!user) return ctx.json({ message: "Unauthorized" }, 401);
   *   if (!allowedRoles.some(r => user.roles.includes(r))) {
   *     return ctx.json({ message: "Forbidden" }, 403);
   *   }
   * }
   */
  checkPermissionStrategy?: (
    ctx: Context<State>,
    allowedRoles: Role[],
  ) => Response | void | Promise<Response | void>;
  /**
   * Cache adapter for API response caching. Defaults to in-memory LRU.
   * Per-instance caching is fine here — responses are idempotent.
   */
  cache?: CacheAdapter;
  /**
   * Cache adapter used exclusively for rate limit counters.
   * Must be a shared backend (Redis, Deno KV) when running multiple instances
   * behind a load balancer — otherwise each instance has its own counter and
   * the effective limit becomes max × instance count.
   * Defaults to the same adapter as `cache`.
   */
  rateLimitCache?: CacheAdapter;
}

/**
 * Map of HTTP status codes to Zod schemas describing the response body.
 * Used by {@linkcode ApiDefinition.responses} for type inference and
 * OpenAPI generation.
 */
export type ResponsesMap = Record<number, z.ZodTypeAny>;

/**
 * Acceptable Zod schema types for an API request body — any object schema,
 * union of object schemas, or `z.any()` for unstructured payloads.
 */
export type RequestBodySchema =
  | z.ZodObject<any, any>
  | z.ZodUnion<any>
  | z.ZodAny;

/** Zod schema describing typed query-string parameters. */
export type QuerySchema = z.ZodObject<any, any>;

/**
 * Infer return type union from responses map.
 */
export type ResponseReturnType<R extends ResponsesMap> = {
  [K in keyof R]:
    | (Omit<z.infer<R[K]>, "statusCode" | "ok"> & {
      statusCode: K extends number ? K : never;
    })
    | Omit<z.infer<R[K]>, "statusCode" | "ok">;
}[keyof R];

type HandlerReturn<R extends ResponsesMap> =
  | Promise<ResponseReturnType<R>>
  | ResponseReturnType<R>
  | Promise<Response>
  | Response;

/**
 * Context with typed request body.
 * Used when requestBody is defined on the API.
 */
export type ContextWithBody<
  B extends RequestBodySchema,
  State,
> =
  & Omit<Context<State>, "req">
  & {
    req: Omit<Context<State>["req"], "body"> & {
      body: B extends z.ZodTypeAny ? z.infer<B> : unknown;
    };
  };

/**
 * Context with typed query params.
 * Used when query is defined on the API.
 */
export type ContextWithQuery<
  Q extends QuerySchema,
  State,
> =
  & Omit<Context<State>, "query">
  & {
    query(): z.infer<Q>;
    query<K extends keyof z.infer<Q>>(key: K): z.infer<Q>[K] | undefined;
  };

/**
 * Context with both typed body and typed query params.
 * Used when both requestBody and query are defined on the API.
 */
export type ContextWithBodyAndQuery<
  B extends RequestBodySchema,
  Q extends QuerySchema,
  State,
> =
  & Omit<Context<State>, "req" | "query">
  & {
    req: Omit<Context<State>["req"], "body"> & {
      body: B extends z.ZodTypeAny ? z.infer<B> : unknown;
    };
    query(): z.infer<Q>;
    query<K extends keyof z.infer<Q>>(key: K): z.infer<Q>[K] | undefined;
  };

/**
 * Full API definition shape.
 */
export interface ApiDefinition<
  State = unknown,
  Role extends string = string,
  R extends ResponsesMap = ResponsesMap,
  B extends RequestBodySchema | null = null,
  Q extends QuerySchema | null = null,
> {
  /** Human readable name — used in OpenAPI docs and error logs */
  name: string;
  /**
   * Directory path — used as OpenAPI tag.
   * Mirrors the file path e.g. "public/search"
   */
  directory: string;
  /** HTTP method this endpoint responds to. */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Explicit path override. If omitted, path is auto-generated from
   * directory + name in kebab-case.
   * @example
   * // Auto: directory="public/search", name="Find Nearby" → /api/public/search/find-nearby
   * // Override: path: "/api/v1/public/search/find-nearby"
   * // Webhook: path: "/webhooks/stripe"
   */
  path?: string | string[];
  /** Human-readable description used by OpenAPI generation. */
  description?: string;
  /**
   * Roles required to access this endpoint.
   * Empty array = public route, no auth required.
   */
  roles: Role[];
  /** Optional response caching — set `ttl` in seconds (0 disables). */
  caching?: {
    /** TTL in seconds. 0 = no cache. */
    ttl: number;
  };
  /**
   * Per-route rate limit. Overrides `defaultRateLimit` from config.
   * Set to `false` to disable rate limiting for this route entirely.
   *
   * @example
   * rateLimit: { max: 5, windowMs: 60_000 }  // 5 req/min
   * rateLimit: false                           // no limit
   */
  rateLimit?: RateLimitConfig | false;
  /** Map of HTTP status codes to Zod schemas describing response bodies. */
  responses: R;
  /** Optional Zod schema describing the JSON request body. */
  requestBody?: B;
  /** Query params Zod schema — parsed, validated, and typed on ctx.query() */
  query?: Q;
  /** Path params Zod schema */
  params?: z.ZodObject<any, any>;
  /** Request handler invoked after auth, validation, rate-limiting, and cache lookup. */
  handler: B extends RequestBodySchema
    ? Q extends QuerySchema
      ? (ctx: ContextWithBodyAndQuery<B, Q, State>, app: Howl<State>) => HandlerReturn<R>
    : (ctx: ContextWithBody<B, State>, app: Howl<State>) => HandlerReturn<R>
    : Q extends QuerySchema
      ? (ctx: ContextWithQuery<Q, State>, app: Howl<State>) => HandlerReturn<R>
    : (ctx: Context<State>, app: Howl<State>) => HandlerReturn<R>;
}

/**
 * An {@linkcode ApiDefinition} with all generic parameters relaxed — useful
 * for collections of heterogeneous APIs (registries, OpenAPI generation).
 */
// deno-lint-ignore no-explicit-any
export type AnyApiDefinition = ApiDefinition<any, any, any, any, any>;
