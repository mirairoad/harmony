import type { PageProps } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import type { JSX } from "preact/jsx-runtime";

export default function Layout(
  { Component, url, state }: PageProps<unknown, State>,
): JSX.Element {
  const isHome = url.pathname === "/";
  const isDocs = url.pathname.startsWith("/docs");
  const title = state.client?.title ?? "Docs";

  return (
    <main class="flex flex-col min-h-screen">
      {/* Top brand bar */}
      <div class="fixed top-0 left-0 right-0 z-40 pointer-events-none h-20 sm:h-24 bg-linear-to-b from-base-100/95 via-base-100/70 to-transparent backdrop-blur-md mask-[linear-gradient(to_bottom,black_55%,transparent)]" />

      {/* Top-left brand */}
      <div class="fixed top-0 left-0 z-50 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <img src="/logo.svg" alt={title} class="w-11 h-11 sm:w-14 sm:h-14" />
        <div class="flex flex-col leading-none gap-1">
          <span class="font-mono font-black text-xl sm:text-2xl text-base-content/90 tracking-tight">
            {title.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Top-right nav — desktop only */}
      <nav class="fixed top-0 right-0 z-50 hidden sm:flex items-center gap-2 p-4">
        <a
          href={isHome ? "/docs" : "/"}
          class="btn btn-ghost btn-md rounded-xl text-base text-base-content/70 hover:text-base-content hover:bg-primary/30"
        >
          {isHome ? "Docs" : "Home"}
        </a>
      </nav>

      {/* Page content */}
      <div class="flex-1 pb-(--nav-h) sm:pb-0">
        <Component />
      </div>

      {/* Footer — entity */}
      <footer class="bg-base-100/80 backdrop-blur pb-(--nav-h) sm:pb-0">
        <div class="max-w-5xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between gap-1 text-left">
          <p class="font-mono text-xs text-base-content/60">
            &copy; {new Date().getFullYear()} {title}<span class="text-primary font-bold">.</span>
          </p>
          <p class="font-mono text-xs text-base-content/60">
            built with <span class="text-primary font-bold">howl</span>
          </p>
        </div>
      </footer>

      {/* Bottom tab bar — mobile only */}
      <nav class="fixed bottom-0 left-0 right-0 z-50 sm:hidden flex items-stretch bg-base-100/98 backdrop-blur-md border-t border-base-300 safe-area-bottom">
        <a
          href="/"
          class={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
            isHome ? "text-primary" : "text-base-content/50"
          }`}
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
            />
          </svg>
          <span class="font-mono text-[11px] font-bold">Home</span>
        </a>
        <a
          href="/docs"
          class={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
            isDocs ? "text-primary" : "text-base-content/50"
          }`}
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
            />
          </svg>
          <span class="font-mono text-[11px] font-bold">Docs</span>
        </a>
      </nav>
    </main>
  );
}
