import { expect } from "@std/expect";
import { h, type VNode } from "preact";
import {
  DATA_ANCESTOR,
  DATA_CURRENT,
  matchesUrl,
  setActiveUrl,
  UrlMatchKind,
} from "../../core/runtime/shared_internal.ts";

function aLink(props: Record<string, unknown>): VNode {
  return h("a", props as Record<string, never>) as unknown as VNode;
}

Deno.test("matchesUrl — exact pathname match returns Current", () => {
  expect(matchesUrl("/about", "/about")).toBe(UrlMatchKind.Current);
});

Deno.test("matchesUrl — ancestor pathname returns Ancestor", () => {
  expect(matchesUrl("/blog/post-1", "/blog")).toBe(UrlMatchKind.Ancestor);
});

Deno.test("matchesUrl — root href is ancestor for any path", () => {
  expect(matchesUrl("/anything", "/")).toBe(UrlMatchKind.Ancestor);
});

Deno.test("matchesUrl — unrelated pathname returns None", () => {
  expect(matchesUrl("/about", "/contact")).toBe(UrlMatchKind.None);
});

Deno.test("matchesUrl — link with query params demotes to Ancestor when search differs", () => {
  // Visiting /tabs?sort=name — link to /tabs?sort=price has same pathname but
  // different query, so it should be ancestor (highlight the parent /tabs as
  // active, but not the specific tab).
  expect(matchesUrl("/tabs", "/tabs?sort=price", "?sort=name")).toBe(
    UrlMatchKind.Ancestor,
  );
});

Deno.test("matchesUrl — link with query params is Current when search matches", () => {
  expect(matchesUrl("/tabs", "/tabs?sort=name", "?sort=name")).toBe(
    UrlMatchKind.Current,
  );
});

Deno.test("matchesUrl — link without query is Current regardless of URL search", () => {
  // The "All" tab (no query) stays Current even when URL has filters applied.
  expect(matchesUrl("/tabs", "/tabs", "?sort=name")).toBe(UrlMatchKind.Current);
});

Deno.test("matchesUrl — link with query and bare URL still demotes to Ancestor", () => {
  // /tabs (no query) shouldn't mark /tabs?sort=name as current.
  expect(matchesUrl("/tabs", "/tabs?sort=name", "")).toBe(
    UrlMatchKind.Ancestor,
  );
});

Deno.test("setActiveUrl — sets data-current and aria-current=page on exact match", () => {
  const vnode = aLink({ href: "/about" });
  setActiveUrl(vnode, "/about");
  const props = vnode.props as Record<string, unknown>;
  expect(props[DATA_CURRENT]).toBe("true");
  expect(props["aria-current"]).toBe("page");
});

Deno.test("setActiveUrl — sets data-ancestor and aria-current=true on ancestor", () => {
  const vnode = aLink({ href: "/blog" });
  setActiveUrl(vnode, "/blog/post-1");
  const props = vnode.props as Record<string, unknown>;
  expect(props[DATA_ANCESTOR]).toBe("true");
  expect(props["aria-current"]).toBe("true");
});

Deno.test("setActiveUrl — does NOT override user-set aria-current", () => {
  // Component libraries (daisyUI tabs etc.) set their own aria-current —
  // Howl must not stomp on it.
  const vnode = aLink({ href: "/about", "aria-current": "step" });
  setActiveUrl(vnode, "/about");
  const props = vnode.props as Record<string, unknown>;
  expect(props["aria-current"]).toBe("step");
  expect(props[DATA_CURRENT]).toBeUndefined();
});

Deno.test("setActiveUrl — passes search through to matchesUrl", () => {
  const vnode = aLink({ href: "/tabs?sort=price" });
  setActiveUrl(vnode, "/tabs", "?sort=name");
  const props = vnode.props as Record<string, unknown>;
  // Different search → ancestor, not current.
  expect(props[DATA_ANCESTOR]).toBe("true");
  expect(props[DATA_CURRENT]).toBeUndefined();
});
