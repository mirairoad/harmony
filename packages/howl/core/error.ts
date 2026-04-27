import type { ErrorStatus } from "@std/http/status";

export type { ErrorStatus };

/**
 * Error that's thrown when a request fails. Correlates to a
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status | HTTP status}.
 *
 * Importable from both server (`@hushkey/howl`) and client
 * (`@hushkey/howl/runtime`) entry points so client code can detect
 * `instanceof HttpError` without pulling server-only imports.
 *
 * @property status The HTTP status code.
 *
 * @example Basic usage
 * ```ts
 * import { Howl, HttpError } from "@hushkey/howl";
 * import { expect } from "@std/expect";
 *
 * const app = new Howl()
 *   .get("/", () => new Response("ok"))
 *   .get("/not-found", () => {
 *      throw new HttpError(404, "Nothing here");
 *    });
 *
 * const handler = app.handler();
 *
 * try {
 *   await handler(new Request("http://localhost/not-found"));
 * } catch (error) {
 *   expect(error).toBeInstanceOf(HttpError);
 *   expect(error.status).toBe(404);
 *   expect(error.message).toBe("Nothing here");
 * }
 * ```
 */
export class HttpError extends Error {
  /** The HTTP status code. */
  status: ErrorStatus;

  /**
   * Construct a new instance.
   *
   * @param status The HTTP status code.
   * @param message Optional error message. When omitted, the server-side
   * error handler fills in the canonical status text — keeping client
   * bundles free of the `@std/http/status` text table.
   * @param options Optional error options.
   */
  constructor(
    status: ErrorStatus,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    // Use a literal so the duck-type check in DEFAULT_ERROR_HANDLER stays
    // reliable under bundlers that rename classes (e.g. SWC/esbuild).
    this.name = "HttpError";
    this.status = status;
  }
}
