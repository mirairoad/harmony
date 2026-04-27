import { DEV_ERROR_OVERLAY_URL } from "../../../core/constants.ts";
import { isHttpError } from "../../../core/error.ts";
import type { Middleware } from "../../../core/middlewares/mod.ts";
import { HowlScripts } from "../../../core/runtime/server/preact_hooks.ts";
import { ErrorOverlay } from "./overlay.tsx";

export function devErrorOverlay<T>(): Middleware<T> {
  return async (ctx: any) => {
    const { config, url } = ctx;
    if (url.pathname === config.basePath + DEV_ERROR_OVERLAY_URL) {
      return ctx.render(<ErrorOverlay url={url} />);
    }

    try {
      return await ctx.next();
    } catch (err) {
      if (ctx.req.headers.get("accept")?.includes("text/html")) {
        let init: ResponseInit | undefined;
        if (isHttpError(err)) {
          if (err.status < 500) throw err;
          init = { status: err.status };
        }

        // At this point we're pretty sure to have a server error
        // deno-lint-ignore no-console
        console.error(err);

        return ctx.render(<HowlScripts />, init);
      }
      throw err;
    }
  };
}
