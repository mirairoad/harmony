import { type ErrorStatus, HttpError } from "../core/error.ts";

/**
 * Re-export of the framework-wide {@linkcode HttpError} class. API and
 * routing/middleware now share a single class — `err.status` is the HTTP
 * status code on every instance, regardless of where the error originated.
 *
 * @example
 * import { HttpError } from "@hushkey/howl/api/errors";
 *
 * throw new HttpError(404, "Not Found");
 */
export { HttpError };

/**
 * Pre-built constructors for common HTTP errors. Throw these from API
 * handlers — the API layer catches them, formats them as
 * `{ error, correlationId }`, and returns the matching status code.
 *
 * @example
 * import errors from "@hushkey/howl/api/errors";
 *
 * throw errors.notFound("Property not found");
 * throw errors.unauthorized();
 * throw errors.forbidden("Admins only");
 */
const errors: {
  /** 400 Bad Request */
  badRequest: (message?: string) => HttpError;
  /** 401 Unauthorized */
  unauthorized: (message?: string) => HttpError;
  /** 403 Forbidden */
  forbidden: (message?: string) => HttpError;
  /** 404 Not Found */
  notFound: (message?: string) => HttpError;
  /** 405 Method Not Allowed */
  disabled: (message?: string) => HttpError;
  /** 409 Conflict */
  conflict: (message?: string) => HttpError;
  /** 500 Internal Server Error */
  internal: (message?: string) => HttpError;
} = {
  badRequest: (message = "Bad Request") => new HttpError(400 as ErrorStatus, message),
  unauthorized: (message = "Unauthorized") => new HttpError(401 as ErrorStatus, message),
  forbidden: (message = "Forbidden") => new HttpError(403 as ErrorStatus, message),
  notFound: (message = "Not Found") => new HttpError(404 as ErrorStatus, message),
  disabled: (message = "Method Not Allowed") => new HttpError(405 as ErrorStatus, message),
  conflict: (message = "Conflict") => new HttpError(409 as ErrorStatus, message),
  internal: (message = "Internal Server Error") => new HttpError(500 as ErrorStatus, message),
};

export default errors;
