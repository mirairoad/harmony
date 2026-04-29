import type { PageProps } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import { readProfile } from "../../server/cv/reader.ts";
import type { JSX } from "preact/jsx-runtime";

export default function Layout(
  { Component, url, state }: PageProps<unknown, State>,
): JSX.Element {
  const profile = readProfile();
  const isHome = url.pathname === "/";
  const isProjects = url.pathname.startsWith("/projects");
  const title = state.client?.title ?? profile.name;

  return (
    <main>
      {/* Top brand bar */}
      <div class="fixed top-0 left-0 right-0 z-40 pointer-events-none h-20 sm:h-24 bg-linear-to-b from-base-100/95 via-base-100/70 to-transparent backdrop-blur-md mask-[linear-gradient(to_bottom,black_55%,transparent)]" />

      {/* Top-left brand */}
      <a href="/" class="fixed top-0 left-0 z-50 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <img src="/logo.svg" alt={title} class="w-11 h-11 sm:w-14 sm:h-14" />
        <div class="flex flex-col leading-none gap-1">
          <span class="font-mono font-black text-xl sm:text-2xl text-base-content/90 tracking-tight">
            {profile.name.toLowerCase().replace(/\s+/g, "")}
          </span>
          <span class="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-base-content/40">
            {profile.title}
          </span>
        </div>
      </a>

      {/* Top-right nav — desktop only */}
      <nav class="fixed top-0 right-0 z-50 hidden sm:flex items-center gap-2 p-4">
        <a
          href="/"
          class={`btn btn-ghost btn-md rounded-xl text-base ${
            isHome
              ? "text-primary bg-primary/10"
              : "text-base-content/70 hover:text-base-content hover:bg-primary/30"
          }`}
        >
          About
        </a>
        <a
          href="/projects"
          class={`btn btn-ghost btn-md rounded-xl text-base ${
            isProjects
              ? "text-primary bg-primary/10"
              : "text-base-content/70 hover:text-base-content hover:bg-primary/30"
          }`}
        >
          Projects
        </a>
        <a
          href={`mailto:${profile.email}`}
          class="btn btn-primary btn-md rounded-xl text-base font-bold"
        >
          Get in touch
        </a>
      </nav>

      {/* Page content */}
      <div class="pb-(--nav-h) sm:pb-0">
        <Component />
      </div>

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
          <span class="font-mono text-[11px] font-bold">About</span>
        </a>
        <a
          href="/projects"
          class={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
            isProjects ? "text-primary" : "text-base-content/50"
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
              d="M3.75 6.75A1.5 1.5 0 0 1 5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75ZM3.75 9.75h16.5"
            />
          </svg>
          <span class="font-mono text-[11px] font-bold">Projects</span>
        </a>
        <a
          href={`mailto:${profile.email}`}
          class="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors text-base-content/50"
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
              d="m21.75 6.75-9.75 7.5-9.75-7.5m19.5 0v10.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6.75m19.5 0A1.5 1.5 0 0 0 20.25 5.25H3.75A1.5 1.5 0 0 0 2.25 6.75"
            />
          </svg>
          <span class="font-mono text-[11px] font-bold">Contact</span>
        </a>
      </nav>
    </main>
  );
}
