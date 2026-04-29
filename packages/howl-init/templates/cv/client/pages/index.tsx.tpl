import { Head } from "@hushkey/howl/runtime";
import type { Context } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import { readFeaturedProjects, readProfile } from "../../server/cv/reader.ts";
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

export default function Index(_ctx: Context<State>): JSX.Element {
  const profile = readProfile();
  const featured = readFeaturedProjects();

  return (
    <>
      <Head>
        <title>{profile.name} — {profile.title}</title>
        <meta
          name="description"
          content={`${profile.name} — ${profile.title}. ${profile.tagline}`}
        />
      </Head>

      <div class="relative min-h-screen bg-base-100 bg-dot-grid bg-size-[28px_28px]">
        {/* Hero */}
        <section class="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-5 sm:px-8 max-w-4xl mx-auto">
          <p class="font-mono text-xs uppercase tracking-[0.3em] text-base-content/40 mb-3 animate-fade-up-1">
            {profile.available}
          </p>
          <h1 class="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] mb-5 animate-fade-up-2">
            {profile.name}.<br />
            <span class="text-primary">{profile.title}.</span>
          </h1>
          <p class="text-lg sm:text-xl text-base-content/70 leading-relaxed max-w-2xl mb-8 animate-fade-up-3">
            {profile.tagline}
          </p>

          <div class="flex flex-wrap gap-2 sm:gap-3 mb-8 animate-fade-up-3">
            <span class="badge badge-lg bg-base-200 border-base-300 font-mono">
              📍 {profile.location}
            </span>
          </div>

          <div class="flex flex-wrap gap-2 sm:gap-3 animate-fade-up-4">
            {profile.social.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm sm:btn-md rounded-xl btn-ghost border border-base-300 hover:border-primary/50 hover:bg-primary/10 font-mono text-xs sm:text-sm"
              >
                <span class="text-base-content/40">{s.label}</span>
                <span class="font-semibold">{s.handle}</span>
              </a>
            ))}
          </div>
        </section>

        {/* About */}
        <section class="relative max-w-4xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <p class="font-mono text-xs uppercase tracking-widest text-base-content/40 mb-4">
            About
          </p>
          <div class="space-y-4 text-base sm:text-lg text-base-content/80 leading-relaxed">
            {profile.about.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>

        {/* Skills */}
        <section class="relative max-w-4xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <p class="font-mono text-xs uppercase tracking-widest text-base-content/40 mb-6">
            Skills
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {profile.skills.map((group) => (
              <div
                key={group.category}
                class="rounded-2xl border border-base-300 bg-base-200/60 backdrop-blur p-5"
              >
                <h3 class="font-semibold text-sm uppercase tracking-wider text-base-content/50 mb-3">
                  {group.category}
                </h3>
                <div class="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      class="badge badge-sm sm:badge-md bg-base-100 border-base-300 font-mono text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section class="relative max-w-4xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <p class="font-mono text-xs uppercase tracking-widest text-base-content/40 mb-6">
            Experience
          </p>
          <ol class="relative border-l-2 border-base-300 ml-2">
            {profile.experience.map((job) => (
              <li key={`${job.company}-${job.start}`} class="mb-10 ml-6 sm:ml-8">
                <span class="absolute -left-[9px] flex items-center justify-center w-4 h-4 bg-primary rounded-full ring-4 ring-base-100" />
                <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
                  <h3 class="text-lg sm:text-xl font-semibold">
                    {job.role}
                    <span class="text-base-content/50 font-normal">
                      {" "}— {job.company}
                    </span>
                  </h3>
                  <span class="font-mono text-xs uppercase tracking-wider text-base-content/40">
                    {job.start} → {job.end}
                  </span>
                </div>
                <p class="text-sm text-base-content/50 mb-2">{job.location}</p>
                <p class="text-base text-base-content/80 leading-relaxed mb-3">
                  {job.summary}
                </p>
                <ul class="list-disc list-outside ml-5 space-y-1.5">
                  {job.highlights.map((h, i) => (
                    <li key={i} class="text-sm text-base-content/70 leading-relaxed">
                      {h}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {/* Featured projects */}
        <section class="relative max-w-4xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <div class="flex items-baseline justify-between mb-6">
            <p class="font-mono text-xs uppercase tracking-widest text-base-content/40">
              Featured projects
            </p>
            <a
              href="/projects"
              class="text-sm text-primary hover:underline font-semibold"
            >
              See all →
            </a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {featured.map((p) => (
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
                  } opacity-50 group-hover:opacity-80 transition-opacity`}
                />
                <div class="relative p-5 sm:p-6">
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p class="font-mono text-[11px] uppercase tracking-widest text-base-content/40 mb-1">
                        {p.year}
                      </p>
                      <h3
                        class={`text-xl font-bold tracking-tight transition-colors ${
                          ACCENT_TEXT[p.accent] ?? ACCENT_TEXT.primary
                        }`}
                      >
                        {p.title}
                      </h3>
                    </div>
                    <span class="text-base-content/30 group-hover:text-base-content text-xl transition-colors">
                      →
                    </span>
                  </div>
                  <p class="text-base text-base-content/70 leading-relaxed mb-4">
                    {p.tagline}
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
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Education + Contact */}
        <section class="relative max-w-4xl mx-auto px-5 sm:px-8 pb-32 sm:pb-24">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <p class="font-mono text-xs uppercase tracking-widest text-base-content/40 mb-4">
                Education
              </p>
              <ul class="space-y-3">
                {profile.education.map((e) => (
                  <li key={`${e.school}-${e.start}`} class="rounded-xl border border-base-300 bg-base-200/60 p-4">
                    <p class="font-semibold text-base">{e.degree}</p>
                    <p class="text-sm text-base-content/60">{e.school}</p>
                    <p class="font-mono text-xs uppercase tracking-wider text-base-content/40 mt-1">
                      {e.start} → {e.end}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p class="font-mono text-xs uppercase tracking-widest text-base-content/40 mb-4">
                Contact
              </p>
              <div class="rounded-2xl border border-primary/30 bg-linear-to-br from-primary/15 to-primary/5 p-6">
                <p class="text-base text-base-content/80 leading-relaxed mb-4">
                  Got a project in mind, or just want to say hi?
                </p>
                <a
                  href={`mailto:${profile.email}`}
                  class="btn btn-primary btn-md rounded-xl font-bold w-full sm:w-auto"
                >
                  {profile.email} →
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
