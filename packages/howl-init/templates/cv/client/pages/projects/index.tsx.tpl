import type { PageProps } from "@hushkey/howl";
import type { State } from "../../../howl.config.ts";
import { readProjects } from "../../../server/cv/reader.ts";
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

export default function ProjectsIndex(ctx: PageProps<unknown, State>): JSX.Element {
  const projects = readProjects();
  const title = ctx.state.client?.title ?? "CV";

  return (
    <>
      <Head>
        <title>Projects — {title}</title>
        <meta
          name="description"
          content="A selection of projects I've designed, shipped or maintained."
        />
      </Head>

      <div class="relative min-h-screen bg-base-100 bg-dot-grid bg-size-[28px_28px] pt-24 sm:pt-32 pb-32 sm:pb-20">
        <div class="max-w-5xl mx-auto px-5 sm:px-8">
          <div class="mb-10 sm:mb-14">
            <p class="font-mono text-xs uppercase tracking-[0.3em] text-base-content/40 mb-2">
              Portfolio
            </p>
            <h1 class="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
              Projects.
            </h1>
            <p class="text-base sm:text-lg text-base-content/70 leading-relaxed max-w-2xl">
              A selection of work I've designed, shipped or maintained — from
              experimental side projects to production systems.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
                <div class="relative p-5 sm:p-7">
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <p class="font-mono text-[11px] uppercase tracking-widest text-base-content/40">
                          {p.year}
                        </p>
                        {p.featured && (
                          <span class="font-mono text-[10px] uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                            Featured
                          </span>
                        )}
                      </div>
                      <h3
                        class={`text-2xl font-bold tracking-tight transition-colors ${
                          ACCENT_TEXT[p.accent] ?? ACCENT_TEXT.primary
                        }`}
                      >
                        {p.title}
                      </h3>
                      <p class="text-sm text-base-content/60 mt-0.5">
                        {p.tagline}
                      </p>
                    </div>
                    <span class="text-base-content/30 group-hover:text-base-content text-xl transition-colors shrink-0 mt-1">
                      →
                    </span>
                  </div>
                  <p class="text-sm sm:text-base text-base-content/70 leading-relaxed mb-4">
                    {p.description}
                  </p>
                  <div class="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        class="badge badge-sm bg-base-100/80 border-base-300 font-mono text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
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
