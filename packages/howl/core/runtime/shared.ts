/**
 * @module
 *
 * Shared runtime entrypoint for `@hushkey/howl/runtime`. Exports types and
 * components that are safe to import from both server and client code —
 * {@linkcode Partial} regions, the {@linkcode Head} component, the
 * `IS_BROWSER` guard, the {@linkcode asset}/{@linkcode assetSrcSet}
 * cache-busting helpers, and a re-export of {@linkcode HttpError} so
 * island code can detect HTTP errors without pulling server-only modules.
 */

import type { ComponentChildren, VNode } from "preact";
import { BUILD_ID } from "../../utils/build-id.ts";
import { assetInternal, assetSrcSetInternal } from "./shared_internal.ts";

/**
 * Re-exported so client-side code can detect `instanceof HttpError`
 * without pulling server-only imports. The class itself lives in
 * `packages/core/error.ts`.
 */
export { HttpError } from "../error.ts";

/**
 * Returns true when the current runtime is the browser and false otherwise. This is used for guard runtime-dependent code.
 * Shorthand for the following:
 * `typeof document !== "undefined"`
 *
 * @example
 * ```
 *  if (IS_BROWSER) {
 *    alert('This is running in the browser!');
 *  } else {
 *    console.log('This code is running on the server, no access to window or alert');
 *  }
 * ```
 *
 * Without this guard, alert pauses the server until return is pressed in the console.
 */
export const IS_BROWSER = typeof document !== "undefined";

/**
 * Create a "locked" asset path. This differs from a plain path in that it is
 * specific to the current version of the application, and as such can be safely
 * served with a very long cache lifetime (1 year).
 */
export function asset(path: string): string {
  return assetInternal(path, BUILD_ID);
}

/** Apply the `asset` function to urls in a `srcset` attribute. */
export function assetSrcSet(srcset: string): string {
  return assetSrcSetInternal(srcset, BUILD_ID);
}

/**
 * Props for the {@linkcode Partial} component.
 */
export interface PartialProps {
  /** Children rendered inside the partial. */
  children?: ComponentChildren;
  /**
   * The name of the partial. This value must be unique across partials.
   */
  name: string;
  /**
   * Define how the new HTML should be applied.
   * @default {"replace"}
   */
  mode?: "replace" | "prepend" | "append";
}

/**
 * Marks a region of the page that can be replaced via Howl partial navigation
 * without re-rendering the rest of the document. The runtime swaps the
 * matching partial in-place when the user navigates.
 */
export function Partial(props: PartialProps): VNode {
  // deno-lint-ignore no-explicit-any
  return props.children as any;
}
/** Component display name surfaced in Preact devtools. */
Partial.displayName = "Partial";

export { Head, type HeadProps } from "./head.ts";
