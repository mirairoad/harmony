import type { PageProps } from "@hushkey/howl";
import type { State } from "../../../howl.config.ts";
import {
  type ProjectStatus,
  readProjects,
} from "../../../server/cv/reader.ts";
import { Head } from "@hushkey/howl/runtime";
import type { JSX } from "preact/jsx-runtime";

const ACCENT_RING: Record<string, string> = {
  primary: "ring-primary/30 hover:ring-primary/60",
  secondary: "ring-secondary/30 hover:ring-secondary/60",
  accent: "ring-accent/30 hover:ring-accent/60",
  info: "ring-info/30 hover:ring-info/60",
  success: "ring-success/30 hover:ring-success/60",
  warning: "ring-warning/30 hover:ring-warning/60",
};

const ACCENT_TEXT: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
};

const ACCENT_BG: Record<string, string> = {
  primary: "from-primary/20 to-primary/5",
  secondary: "from-secondary/20 to-secondary/5",
  accent: "from-accent/20 to-accent/5",
  info: "from-info/20 to-info/5",
  success: "from-success/20 to-success/5",
  warning: "from-warning/20 to-warning/5",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  shipped: "Shipped",
  production: "In production",
  development: "In dev",
  archived: "Archived",
};

function StatusBadge({ status }: { status: ProjectStatus }): JSX.Element {
  if (status === "production") {
    return (
      <span class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
        <span class="relative flex h-1.5 w-1.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/70 opacity-75" />
          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
        {STATUS_LABEL[status]}
      </span>
    );
  }
  if (status === "development") {
    return (
      <span class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-info bg-info/10 px-2 py-0.5 rounded">
        <span class="relative flex h-1.5 w-1.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-info/70 opacity-75" />
          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-info" />
        </span>
        {STATUS_LABEL[status]}
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span class="font-mono text-[10px] uppercase tracking-widest text-base-content/40 bg-base-content/5 px-2 py-0.5 rounded">
        {STATUS_LABEL[status]}
      </span>
    );
  }
  return (
    <span class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-success bg-success/10 px-2 py-0.5 rounded">
      <svg
        class="w-2.5 h-2.5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.41 0z"
          clip-rule="evenodd"
        />
      </svg>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function ProjectsIndex(ctx: PageProps<unknown, State>): JSX.Element {
  const projects = readProjects();
  const title = ctx.state.client?.title ?? "Software";

  return (
    <>
      <Head>
        <title>Products — {title}</title>
        <meta
          name="description"
          content="Frameworks, apps and tools shipped by the Hushkey studio."
        />
      </Head>

      <div class="relative flex-1 bg-base-100 bg-dot-grid bg-size-[28px_28px] pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div class="max-w-5xl mx-auto px-5 sm:px-8">
          <div class="mb-10 sm:mb-14">
            <p class="font-mono text-xs uppercase tracking-[0.3em] text-base-content/40 mb-2">
              by Hushkey
            </p>
            <h1 class="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
              Products<span class="text-primary">.</span>
            </h1>
            <p class="text-base sm:text-lg text-base-content/70 leading-relaxed max-w-2xl">
              Everything we ship. Tap any card to dig into the details — what
              it is, what's in the stack, links to the repo or live site.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {projects.map((p) => (
              <a
                key={p.slug}
                href={`/projects/${p.slug}`}
                class={`group relative rounded-2xl border border-base-300 bg-base-200/60 backdrop-blur ring-1 ring-transparent transition-all overflow-hidden ${
                  ACCENT_RING[p.accent] ?? ACCENT_RING.primary
                }`}
              >
                <div
                  class={`absolute inset-0 bg-linear-to-br ${
                    ACCENT_BG[p.accent] ?? ACCENT_BG.primary
                  } opacity-40 group-hover:opacity-80 transition-opacity`}
                />
                <div class="relative p-5 flex flex-col gap-3 h-full">
                  <div class="flex items-center justify-between gap-3">
                    <StatusBadge status={p.status} />
                    <span class="font-mono text-[10px] uppercase tracking-widest text-base-content/40">
                      {p.year}
                    </span>
                  </div>
                  <div>
                    <h3
                      class={`text-xl font-bold tracking-tight transition-colors ${
                        ACCENT_TEXT[p.accent] ?? ACCENT_TEXT.primary
                      }`}
                    >
                      {p.title}
                    </h3>
                    <p
                      class={`font-mono text-[11px] uppercase tracking-widest mt-1 ${
                        ACCENT_TEXT[p.accent] ?? ACCENT_TEXT.primary
                      } opacity-70`}
                    >
                      {p.tagline}
                    </p>
                  </div>
                  <p class="text-sm text-base-content/70 leading-relaxed line-clamp-3 flex-1">
                    {p.description}
                  </p>
                  <div class="flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        class="badge badge-sm bg-base-100/80 border-base-300 font-mono text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div class="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-base-300/60">
                    <span
                      class={`font-mono text-xs font-bold transition-colors ${
                        ACCENT_TEXT[p.accent] ?? ACCENT_TEXT.primary
                      } group-hover:underline`}
                    >
                      Read more
                    </span>
                    <span class="text-base-content/30 group-hover:text-base-content text-base transition-all group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
