// packages/core/cookies.ts

export interface CookieOptions {
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  expires?: Date;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * First-class cookie manager for Howl's Context.
 * Reads from request headers, writes to response headers.
 * Multiple Set-Cookie headers are preserved via append — never overwritten.
 */
export class CookieManager {
  #requestHeaders: Headers;
  #responseHeaders: Headers;

  constructor(requestHeaders: Headers, responseHeaders: Headers) {
    this.#requestHeaders = requestHeaders;
    this.#responseHeaders = responseHeaders;
  }

  /**
   * Get a cookie value from the incoming request.
   *
   * @example
   * const token = ctx.cookies.get("token");
   */
  get(name: string): string | undefined {
    const cookieHeader = this.#requestHeaders.get("cookie");
    if (!cookieHeader) return undefined;

    for (const part of cookieHeader.split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key.trim() === name) return rest.join("=");
    }
    return undefined;
  }

  /**
   * Set a cookie on the response.
   * Uses append — multiple cookies are preserved correctly.
   *
   * @example
   * ctx.cookies.set("token", jwt, { httpOnly: true, maxAge: 86400 });
   */
  set(name: string, value: string, options: CookieOptions = {}): void {
    const {
      path = "/",
      domain,
      httpOnly = true,
      maxAge,
      expires,
      sameSite = "Strict",
    } = options;

    // Auto-detect secure from request protocol
    const proto = this.#requestHeaders.get("x-forwarded-proto");
    const isHttps = proto === "https";
    const secure = options.secure !== undefined ? options.secure : isHttps;

    let cookie = `${name}=${value}`;
    if (path) cookie += `; Path=${path}`;
    if (secure) cookie += "; Secure";
    if (domain) cookie += `; Domain=${domain}`;
    if (httpOnly) cookie += "; HttpOnly";
    if (maxAge !== undefined) cookie += `; Max-Age=${maxAge}`;
    if (expires) cookie += `; Expires=${expires.toUTCString()}`;
    if (sameSite) cookie += `; SameSite=${sameSite}`;

    // CRITICAL: append not set — preserves multiple Set-Cookie headers
    this.#responseHeaders.append("Set-Cookie", cookie);
  }

  /**
   * Delete a cookie by setting Max-Age=0.
   *
   * @example
   * ctx.cookies.delete("token");
   */
  delete(name: string, options: Pick<CookieOptions, "path" | "domain"> = {}): void {
    this.set(name, "", {
      ...options,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  /**
   * Get all cookies from the incoming request.
   *
   * @example
   * const all = ctx.cookies.all();
   */
  all(): Record<string, string> {
    const cookieHeader = this.#requestHeaders.get("cookie");
    if (!cookieHeader) return {};

    return cookieHeader.split(";").reduce((acc, part) => {
      const [key, ...rest] = part.trim().split("=");
      if (key.trim()) acc[key.trim()] = rest.join("=");
      return acc;
    }, {} as Record<string, string>);
  }
}
