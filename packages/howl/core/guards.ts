/**
 * `true` when the module is executing on the server (Deno) — i.e. there is no
 * `window` global. Use to guard browser-only code paths inside island
 * components and shared modules so they don't crash during SSR.
 *
 * @example
 * ```ts
 * import { IS_SERVER } from "@hushkey/howl";
 *
 * const stored = IS_SERVER ? null : localStorage.getItem("prefs");
 * ```
 */
export const IS_SERVER: boolean = typeof window === "undefined";

/**
 * `true` when the module is executing in the browser. Inverse of
 * {@linkcode IS_SERVER}.
 *
 * @example
 * ```ts
 * import { IS_BROWSER } from "@hushkey/howl";
 *
 * if (IS_BROWSER) {
 *   document.addEventListener("keydown", onKey);
 * }
 * ```
 */
export const IS_BROWSER: boolean = !IS_SERVER;
