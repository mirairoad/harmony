/**
 * Typed HTTP error.
 * Throw from API handlers — asyncHandler catches and formats the response.
 *
 * @example
 * import errors from "@hushkey/howl/api/errors";
 *
 * throw errors.notFound("Property not found");
 * throw errors.unauthorized();
 * throw errors.forbidden("Admins only");
 */
export class HttpError extends Error {
  /** The HTTP status code emitted in the JSON error response. */
  readonly statusCode: number;

  /** Construct an `HttpError` for the given status code and message. */
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

/**
 * Pre-built constructors for common HTTP errors. Throw these from API
 * handlers — the API layer formats them into a JSON `{ error, service }`
 * response body with the matching status code.
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
  badRequest: (message = "Bad Request") => new HttpError(400, message),
  unauthorized: (message = "Unauthorized") => new HttpError(401, message),
  forbidden: (message = "Forbidden") => new HttpError(403, message),
  notFound: (message = "Not Found") => new HttpError(404, message),
  disabled: (message = "Method Not Allowed") => new HttpError(405, message),
  conflict: (message = "Conflict") => new HttpError(409, message),
  internal: (message = "Internal Server Error") => new HttpError(500, message),
};

export default errors;
