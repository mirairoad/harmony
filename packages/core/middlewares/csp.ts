import { setNonce } from "../context.ts";
import type { Middleware } from "./mod.ts";

/** Options for Content-Security-Policy middleware */
export interface CSPOptions {
  /** If true, sets Content-Security-Policy-Report-Only header instead of Content-Security-Policy */
  reportOnly?: boolean;

  /** If set, adds Reporting-Endpoints, report-to, and report-uri directive */
  reportTo?: string;

  /** Additional CSP directives to add or override the defaults */
  csp?: string[];

  /**
   * Inject a per-request nonce into `script-src` and propagate it to the
   * bootloader `<script>` tag. Enables strict CSP without `'unsafe-inline'`.
   * Defaults to `true`.
   */
  nonce?: boolean;
}

/**
 * Middleware to set Content-Security-Policy headers
 *
 * @param options - CSP options
 *
 * @example Basic usage
 * ```ts
 * app.use(csp({
 *   reportOnly: true,
 *   reportTo: '/api/csp-reports',
 *   csp: [
 *     "script-src 'self' 'unsafe-inline' 'https://example.com'",
 *   ],
 * }));
 * ```
 */
export function csp<State>(options: CSPOptions = {}): Middleware<State> {
  const {
    reportOnly = false,
    reportTo,
    csp = [],
    nonce = true,
  } = options;

  const baseDefaults = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  const tailDirectives: string[] = [];
  if (reportTo) {
    tailDirectives.push(`report-to csp-endpoint`);
    tailDirectives.push(`report-uri ${reportTo}`);
  }

  return async (ctx) => {
    let scriptSrc: string;
    if (nonce) {
      const value = crypto.randomUUID().replace(/-/g, "");
      setNonce(ctx, value);
      scriptSrc = `script-src 'nonce-${value}' 'strict-dynamic' 'self'`;
    } else {
      scriptSrc = "script-src 'self' 'unsafe-inline'";
    }

    const cspString = [...baseDefaults, scriptSrc, ...csp, ...tailDirectives].join("; ");

    const res = await ctx.next();
    const headerName = reportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
    res.headers.set(headerName, cspString);
    if (reportTo) {
      res.headers.set("Reporting-Endpoints", `csp-endpoint="${reportTo}"`);
    }
    return res;
  };
}
