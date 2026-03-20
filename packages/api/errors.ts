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
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

const errors = {
  badRequest: (message = "Bad Request"): HttpError => new HttpError(400, message),
  unauthorized: (message = "Unauthorized"): HttpError => new HttpError(401, message),
  forbidden: (message = "Forbidden"): HttpError => new HttpError(403, message),
  notFound: (message = "Not Found"): HttpError => new HttpError(404, message),
  disabled: (message = "Method Not Allowed"): HttpError => new HttpError(405, message),
  conflict: (message = "Conflict"): HttpError => new HttpError(409, message),
  internal: (message = "Internal Server Error"): HttpError => new HttpError(500, message),
};

export default errors;
