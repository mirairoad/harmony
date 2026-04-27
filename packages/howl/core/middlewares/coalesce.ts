import type { Middleware } from "./mod.ts";

/**
 * Deduplicates concurrent GET requests to the same URL from unauthenticated
 * clients. When a thundering herd hits a public page before the first render
 * resolves, only one handler runs — all others await and receive a clone.
 *
 * Safe only for public routes: requests with a Cookie or Authorization header
 * are never coalesced (user-specific state would bleed between renders).
 * Note: coalescing is per-instance — use this alongside a shared cache adapter
 * for full cross-instance deduplication.
 *
 * Place early in the middleware chain, before route handlers.
 *
 * @example
 * app.use(coalesceRequests());
 * app.fsClientRoutes();
 */
// deno-lint-ignore no-explicit-any
export function coalesceRequests(): Middleware<any> {
  const inflight = new Map<string, Promise<Response>>();

  // deno-lint-ignore no-explicit-any
  return async (ctx: any) => {
    if (
      ctx.req.method !== "GET" ||
      ctx.req.headers.has("cookie") ||
      ctx.req.headers.has("authorization")
    ) {
      return ctx.next();
    }

    const key = ctx.url.pathname + ctx.url.search;

    if (inflight.has(key)) {
      return (await inflight.get(key)!).clone();
    }

    // Expose a shared promise before awaiting so concurrent arrivals join it
    let settle!: (r: Response) => void;
    let reject!: (e: unknown) => void;
    const shared = new Promise<Response>((res, rej) => {
      settle = res;
      reject = rej;
    });
    inflight.set(key, shared);

    try {
      const response = await ctx.next();
      // Clone before settling so waiters can clone from a fresh reference
      settle(response.clone());
      return response;
    } catch (err) {
      reject(err);
      throw err;
    } finally {
      inflight.delete(key);
    }
  };
}
