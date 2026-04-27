import { type VNode } from "preact";
import { useEffect, useState } from "preact/hooks";

/**
 * Render `children` only after the component has mounted on the client.
 * Returns `null` during SSR — useful for wrapping browser-only widgets.
 *
 * @example
 * ```tsx
 * <ClientOnly>{() => <Chart />}</ClientOnly>
 * ```
 */
export function ClientOnly(
  { children }: { children: () => VNode },
): VNode | null {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return children();
}
