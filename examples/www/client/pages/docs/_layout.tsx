import type { PageProps } from "@hushkey/howl";
import type { State } from "../../../../howl.config.ts";
import { readManifest } from "../../../server/docs/reader.ts";

export default async function DocsLayout(
  { Component, url }: PageProps<unknown, State>,
): Promise<JSX.Element> {
  const manifest = await readManifest();
  const segments = url.pathname.replace(/\/$/, "").split("/");
  const currentSlug = segments[segments.length - 1] === "docs" ? "" : segments[segments.length - 1];

  return (
    <div class="flex min-h-[calc(100vh-4rem)] bg-base-100">
      {/* Sidebar */}
      <aside class="hidden lg:flex w-64 shrink-0 flex-col border-r border-base-300 bg-base-100">
        <div class="sticky top-0 p-4 overflow-y-auto max-h-screen">
          <p class="text-xs font-semibold uppercase tracking-widest text-base-content/50 mb-3 px-2">
            Documentation
          </p>
          <ul class="menu menu-sm gap-0.5 p-0">
            {manifest.map((item) => {
              const isActive = item.slug === currentSlug;
              return (
                <li key={item.slug}>
                  <a
                    href={`/docs/${item.slug}`}
                    class={`rounded-lg text-sm ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-base-content/70 hover:text-base-content hover:bg-base-200"
                    }`}
                  >
                    {item.title}
                  </a>
                </li>
              );
            })}
          </ul>
          <div class="divider my-3 opacity-30" />
          <div class="px-2 space-y-1">
            <a
              href="https://jsr.io/@hushkey/howl"
              class="flex items-center gap-2 text-xs text-base-content/50 hover:text-base-content transition-colors"
              target="_blank"
            >
              <span>JSR</span>
              <span class="badge badge-xs">↗</span>
            </a>
            <a
              href="https://github.com/mirairoad/howl"
              class="flex items-center gap-2 text-xs text-base-content/50 hover:text-base-content transition-colors"
              target="_blank"
            >
              <span>GitHub</span>
              <span class="badge badge-xs">↗</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-300 px-4 py-2 overflow-x-auto">
        <ul class="flex gap-1 min-w-max">
          {manifest.map((item) => {
            const isActive = item.slug === currentSlug;
            return (
              <li key={item.slug}>
                <a
                  href={`/docs/${item.slug}`}
                  class={`btn btn-xs ${isActive ? "btn-primary" : "btn-ghost"}`}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Content */}
      <div class="flex-1 min-w-0 pb-16 lg:pb-0">
        <Component />
      </div>
    </div>
  );
}
