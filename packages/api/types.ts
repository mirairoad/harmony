import type { Context } from "../core/context.ts";
import type { Howl } from "../core/app.ts";
import { z } from "zod";

/**
 * Cache adapter interface.
 * Implement this to plug in any cache backend.
 */
export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Howl API configuration — defined in howl.config.ts.
 */
export interface HowlApiConfig<
  State = unknown,
  Role extends string = string,
> {
  /** Valid roles for this app — typed from your Role union */
  roles: readonly Role[];
  /**
   * Extract authenticated user from context.
   * Return null if unauthenticated.
   */
  getUser: (
    ctx: Context<State>,
    app: Howl<State>,
  ) => Promise<
    {
      isAuthenticated: boolean;
      roles: Role[];
      id: string;
      [key: string]: unknown;
    } | null
  >;
  /**
   * Cache adapter. Defaults to in-memory LRU.
   */
  cache?: CacheAdapter;
}

export type ResponsesMap = Record<number, z.ZodTypeAny>;

export type RequestBodySchema =
  | z.ZodObject<any, any>
  | z.ZodUnion<any>
  | z.ZodAny;

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
 * Full API definition shape.
 */
export interface ApiDefinition<
  State = unknown,
  Role extends string = string,
  R extends ResponsesMap = ResponsesMap,
  B extends RequestBodySchema | null = null,
> {
  /** Human readable name — used in OpenAPI docs and error logs */
  name: string;
  /**
   * Directory path — used as OpenAPI tag.
   * Mirrors the file path e.g. "public/search"
   */
  directory: string;
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
  description?: string;
  /**
   * Roles required to access this endpoint.
   * Empty array = public route, no auth required.
   */
  roles: Role[];
  caching?: {
    /** TTL in seconds. 0 = no cache. */
    ttl: number;
  };
  /**
   * Redirect URL on auth failure.
   * null = return 401/403 JSON response.
   */
  redirectOnFailure?: string | null;
  responses: R;
  requestBody?: B;
  /** Path params Zod schema */
  params?: z.ZodObject<any, any>;
  handler: B extends RequestBodySchema ? (
      ctx: ContextWithBody<B, State>,
      app: Howl<State>,
    ) => HandlerReturn<R>
    : (
      ctx: Context<State>,
      app: Howl<State>,
    ) => HandlerReturn<R>;
}

// deno-lint-ignore no-explicit-any
export type AnyApiDefinition = ApiDefinition<any, any, any, any>;
