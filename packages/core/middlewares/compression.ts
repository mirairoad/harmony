import type { Middleware } from "./mod.ts";

const COMPRESSIBLE = /text\/|application\/json|application\/javascript|image\/svg/;

/**
 * Gzip-compresses responses whose Content-Type is text, JSON, JS, or SVG.
 * Skips already-encoded responses, HEAD requests, and bodies with no content.
 *
 * Place this early in the middleware chain so it wraps all responses.
 *
 * @example
 * app.use(compression());
 * app.use(staticFiles());
 * app.fsClientRoutes();
 */
// deno-lint-ignore no-explicit-any
export function compression(): Middleware<any> {
  // deno-lint-ignore no-explicit-any
  return async (ctx: any) => {
    const response: Response = await ctx.next();

    if (
      ctx.req.method === "HEAD" ||
      response.body === null ||
      response.headers.get("content-encoding")
    ) {
      return response;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!COMPRESSIBLE.test(contentType)) {
      return response;
    }

    const accept = ctx.req.headers.get("accept-encoding") ?? "";
    const encoding: CompressionFormat | null = accept.includes("gzip")
      ? "gzip"
      : accept.includes("deflate")
      ? "deflate"
      : null;

    if (!encoding) return response;

    const compressed = response.body.pipeThrough(new CompressionStream(encoding));

    const headers = new Headers(response.headers);
    headers.set("Content-Encoding", encoding);
    headers.delete("Content-Length");
    headers.append("Vary", "Accept-Encoding");

    return new Response(compressed, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
