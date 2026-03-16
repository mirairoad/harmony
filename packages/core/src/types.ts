import type { RouteHandler } from "./handlers.ts";
import type { Method } from "./router.ts";
import type { RouteComponent } from "./segments.ts";

export interface RouteConfig {
  routeOverride?: string;
  csp?: boolean;
  skipInheritedLayouts?: boolean;
  skipAppWrapper?: boolean;
  methods?: "ALL" | Method[];
}

export interface LayoutConfig {
  skipInheritedLayouts?: boolean;
  skipAppWrapper?: boolean;
}

export interface Route<State> {
  component?: RouteComponent<State>;
  config?: RouteConfig;
  handler?: RouteHandler<unknown, State>;
  css?: string[];
}

export type Lazy<T> = () => Promise<T>;
export type MaybeLazy<T> = T | Lazy<T>;