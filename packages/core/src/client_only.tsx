import { type VNode } from "preact";
import { useEffect, useState } from "preact/hooks";

export function ClientOnly(
  { children }: { children: () => VNode },
): VNode | null {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return children();
}
