import { type ComponentChildren, createContext, h } from "preact";

/**
 * Preact context flag set to `true` while rendering the document `<head>`.
 * Components inspect this to opt out of behaviour that does not belong in head.
 */
export const HeadContext: ReturnType<typeof createContext<boolean>> = createContext(false);

/**
 * Props for the {@linkcode Head} component.
 */
export interface HeadProps {
  /** Children rendered inside the document `<head>`. */
  children?: ComponentChildren;
}

/**
 * Render its children into the document `<head>` (e.g. `<title>`, `<meta>`).
 * Wraps children in {@linkcode HeadContext} so descendants can detect they are
 * being rendered for `<head>`.
 */
export function Head(props: HeadProps): ComponentChildren {
  return h(HeadContext, { value: true }, props.children);
}
