import type { Context } from "../core/context.ts";
import { z, ZodError } from "zod";
import type { RequestBodySchema } from "./types.ts";

/**
 * Pre-handler middleware — runs before every API handler.
 * Validates path params, query params, and parses/validates request body.
 * Stores parsed values on ctx.state.__body / ctx.state.__query for handler access.
 */
export function preAsyncHandler<State>(
  params: z.ZodObject<any, any> | undefined | null,
  requestBodySchema: RequestBodySchema | null | undefined,
  querySchema: z.ZodObject<any, any> | null | undefined,
) {
  return async (ctx: Context<State>): Promise<Response> => {
    try {
      // Validate path params
      if (params) {
        params.parse(ctx.params);
      }

      // Validate and store query params
      if (querySchema) {
        const raw: Record<string, string> = {};
        ctx.url.searchParams.forEach((val, key) => {
          raw[key] = val;
        });
        // deno-lint-ignore no-explicit-any
        (ctx.state as any).__query = querySchema.parse(raw);
      }

      // Skip body parsing for read-only methods
      if (
        ctx.req.method === "GET" ||
        ctx.req.method === "OPTIONS" ||
        ctx.req.method === "HEAD"
      ) {
        return ctx.next();
      }

      // Only consume + JSON.parse the body when the request is actually JSON.
      // This leaves the body stream unconsumed for multipart, binary, etc.
      const contentType = ctx.req.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");

      if (!isJson && !requestBodySchema) {
        return ctx.next();
      }

      let data: unknown = {};
      const raw = await ctx.req.text();
      if (raw.trim() !== "") {
        try {
          data = JSON.parse(raw);
        } catch {
          return ctx.json(
            { error: "Invalid JSON body" },
            { status: 400 },
          );
        }
      }

      if (requestBodySchema) {
        data = requestBodySchema.parse(data);
      }

      // deno-lint-ignore no-explicit-any
      (ctx.state as any).__body = data;
      return ctx.next();
    } catch (err) {
      if (err instanceof ZodError) {
        return ctx.json(
          {
            error: "Validation failed",
            fields: err.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      return ctx.json({ error: `${err}` }, { status: 400 });
    }
  };
}
