import { Head } from "@hushkey/howl/runtime";
import type { Context } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import type { JSX } from "preact/jsx-runtime";

function MobileStepCard(
  { n, label, children }: {
    n: string;
    label: string;
    children: JSX.Element | JSX.Element[];
  },
) {
  return (
    <div class="border border-base-300 rounded-xl bg-base-200/70 overflow-hidden mx-4">
      <div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-base-300">
        <span class="w-2.5 h-2.5 rounded-full bg-error/70" />
        <span class="w-2.5 h-2.5 rounded-full bg-warning/70" />
        <span class="w-2.5 h-2.5 rounded-full bg-success/70" />
        <span class="ml-1.5 font-mono text-[11px] font-semibold text-base-content/50 uppercase tracking-widest">
          {n} · {label}
        </span>
      </div>
      <div class="px-4 py-3.5 font-mono text-[13px] leading-relaxed flex flex-col gap-1.5">
        {children}
      </div>
    </div>
  );
}

function StepArrow() {
  return (
    <div class="flex justify-center py-1">
      <svg
        class="w-5 h-5 text-primary/50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75"
        />
      </svg>
    </div>
  );
}

const FEATURES = [
  {
    label: "Native cookies on ctx",
    desc: "ctx.cookies.get/set/delete — append semantics preserved across middleware.",
  },
  {
    label: "Headers → every response",
    desc: "ctx.headers.set() in middleware propagates to page renders, not just API responses.",
  },
  {
    label: "React ecosystem, no Vite",
    desc: "sonner, radix, react-hot-toast — all work out of the box via Preact compat.",
  },
  {
    label: "Typed endpoints + Zod",
    desc: "defineApi gives fully typed query, body, params, and responses. Zero boilerplate.",
  },
  {
    label: "Auto-generated OpenAPI",
    desc: "getApiSpecs() returns a live OpenAPI 3.1 doc — query params, roles, responses included.",
  },
  {
    label: "Built-in RBAC",
    desc: "checkPermissionStrategy in defineConfig — one place, typed roles, no middleware noise.",
  },
];

export default function Index(_ctx: Context<State>): JSX.Element {
  const title = _ctx.state.client.title;
  const version = _ctx.state.client.version;

  return (
    <>
      <Head>
        <title>{title} — Full-Stack Deno Framework</title>
        <meta
          name="description"
          content={`${title} is a backend-first, Deno-native full-stack framework. Typed endpoints, SSR islands, and middleware that works.`}
        />
        <meta property="og:title" content={`${title} — Full-Stack Deno Framework`} />
        <meta
          property="og:description"
          content={`${title} is a backend-first, Deno-native full-stack framework. Typed endpoints, SSR islands, and middleware that works.`}
        />
        <meta property="og:image" content="https://howl.hushkey.dev/og-image.png" />
        <meta property="og:url" content="https://howl.hushkey.dev" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${title} — Full-Stack Deno Framework`} />
        <meta
          name="twitter:description"
          content={`${title} is a backend-first, Deno-native full-stack framework. Typed endpoints, SSR islands, and middleware that works.`}
        />
        <meta name="twitter:image" content="https://howl.hushkey.dev/og-image.png" />
      </Head>

      {/* ─────────────── MOBILE ─────────────── */}
      <div class="sm:hidden relative min-h-screen bg-base-100 bg-dot-grid bg-size-[28px_28px] flex flex-col overflow-hidden pt-20 pb-6">
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary opacity-[0.06] blur-3xl" />
        </div>

        {/* Hero */}
        <div class="animate-fade-up-1 flex items-center justify-center mb-3 px-5">
          <img
            src="/logo.svg"
            alt="Howl"
            class="w-24 h-24"
            style="filter: drop-shadow(0 0 24px oklch(var(--p)/0.5))"
          />
        </div>

        <div class="animate-fade-up-2 text-center mb-2 px-5">
          <h1 class="text-6xl font-bold tracking-tight leading-none">{title.toUpperCase()}</h1>
          <p class="mt-2.5 text-base-content/60 text-[11px] font-bold tracking-[0.25em] uppercase">
            Web Framework · Type-Safe · Deno
          </p>
        </div>

        <p class="animate-fade-up-3 text-base-content/70 text-center text-base leading-relaxed mb-6 px-6">
          Backend-first full-stack framework for Deno. Typed endpoints, SSR islands, built-in RBAC,
          and middleware that propagates to every response.
        </p>

        {/* CTAs */}
        <div class="animate-fade-up-3 flex flex-col gap-2.5 mb-10 px-5">
          <a href="/docs" class="btn btn-primary btn-md w-full text-base font-bold rounded-xl">
            Read the docs →
          </a>
          <a
            href="https://github.com/hushkey/howl"
            target="_blank"
            class="btn btn-outline btn-md w-full rounded-xl text-base"
          >
            GitHub
          </a>
        </div>

        {/* Quick start steps */}
        <div class="animate-fade-up-4 w-full mb-10">
          <p class="text-center font-black text-[11px] uppercase tracking-widest text-base-content/40 mb-5 px-5">
            Get started in 4 steps
          </p>

          <div class="flex flex-col gap-1">
            <MobileStepCard n="01" label="install">
              <div>
                <span class="text-primary/70 select-none">$</span>
                <span class="text-base-content/80">deno add</span>
                <span class="text-primary font-semibold">jsr:@hushkey/howl</span>
              </div>
              <div class="text-base-content/50 text-[12px] mt-1">
                Deno · Fresh · Preact · esbuild
              </div>
            </MobileStepCard>

            <StepArrow />

            <MobileStepCard n="02" label="configure">
              <div class="text-base-content/40 text-[12px] mb-1">
                {"// howl.config.ts"}
              </div>
              <div>
                <span class="text-base-content/60">export const</span>
                <span class="text-base-content/85">{"{ defineApi }"} =</span>
              </div>
              <div class="pl-4">
                <span class="text-primary font-semibold">defineConfig</span>
                <span class="text-base-content/60">{"<State, Role>({"}</span>
              </div>
              <div class="pl-8">
                <span class="text-base-content/60">roles,</span>
              </div>
              <div class="pl-8">
                <span class="text-base-content/60">cache:</span>
                <span class="text-success font-semibold">memoryCache</span>
                <span class="text-base-content/60">(),</span>
              </div>
              <div class="pl-4 text-base-content/60">{"})"}</div>
            </MobileStepCard>

            <StepArrow />

            <MobileStepCard n="03" label="server">
              <div class="text-base-content/40 text-[12px] mb-1">
                {"// server/main.ts"}
              </div>
              <div>
                <span class="text-base-content/60">const app =</span>
                <span class="text-base-content/60">new</span>
                <span class="text-primary font-semibold">Howl</span>
                <span class="text-base-content/60">{"<State>()"}</span>
              </div>
              <div>
                <span class="text-base-content/85">app</span>
                <span class="text-primary font-semibold">.configure</span>
                <span class="text-base-content/60">(middleware)</span>
              </div>
              <div>
                <span class="text-base-content/85">app</span>
                <span class="text-primary font-semibold">.fsApiRoutes</span>
                <span class="text-base-content/60">(apiConfig)</span>
              </div>
              <div>
                <span class="text-base-content/85">app</span>
                <span class="text-primary font-semibold">.fsClientRoutes</span>
                <span class="text-base-content/60">()</span>
              </div>
            </MobileStepCard>

            <StepArrow />

            <MobileStepCard n="04" label="pages">
              <div class="text-base-content/40 text-[12px] mb-1">
                {"// client/pages/index.tsx"}
              </div>
              <div>
                <span class="text-base-content/60">export default function</span>
                <span class="text-primary font-semibold">Index</span>
                <span class="text-base-content/60">(ctx:</span>
                <span class="text-success font-semibold">Context</span>
                <span class="text-base-content/60">{"<State>) {"}</span>
              </div>
              <div class="pl-4 text-base-content/60">return (</div>
              <div class="pl-8">
                <span class="text-base-content/60">{"<h1>"}</span>
                <span class="text-success font-semibold">{"{"}</span>
                <span class="text-base-content/85">ctx.state.client.title</span>
                <span class="text-success font-semibold">{"}"}</span>
                <span class="text-base-content/60">{"</h1>"}</span>
              </div>
              <div class="pl-4 text-base-content/60">)</div>
              <div class="text-base-content/60">{"}"}</div>
              <div class="text-base-content/40 text-[11px] pt-1">
                state flows from middleware → page
              </div>
            </MobileStepCard>
          </div>
        </div>

        {/* Features */}
        <div class="animate-fade-up-5 w-full mt-4 px-4">
          <p class="text-center font-mono text-[11px] uppercase tracking-widest text-base-content/40 mb-5">
            What {title} adds on top of Fresh
          </p>
          <div class="flex flex-col gap-3">
            {FEATURES.map(({ label, desc }) => (
              <div key={label} class="rounded-xl border border-base-300 bg-base-200/70 px-4 py-3">
                <p class="font-mono text-[12px] font-bold text-primary mb-1">{label}</p>
                <p class="text-[12px] text-base-content/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────── DESKTOP ─────────────── */}
      <div class="hidden sm:block relative min-h-screen bg-base-100 bg-dot-grid bg-size-[28px_28px] overflow-hidden">
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary opacity-[0.04] blur-3xl" />
          <div class="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-secondary opacity-[0.04] blur-3xl" />
        </div>

        <div class="flex flex-col items-center px-6 pt-32 pb-20">
          {/* HTTP Traffic */}
          <div class="animate-fade-up-1 relative flex items-center justify-center mb-8 mt-16 h-105 w-full max-w-5xl overflow-hidden">
            <div
              class="absolute inset-0 flex items-stretch justify-center gap-2 px-6"
              style="mask-image: linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%);"
            >
              {[
                {
                  method: "GET",
                  code: "200",
                  color: "#22d3ee",
                  dir: "up",
                  duration: 4.8,
                  delay: 0,
                },
                {
                  method: "POST",
                  code: "201",
                  color: "#fbbf24",
                  dir: "down",
                  duration: 6.2,
                  delay: 1.4,
                },
                {
                  method: "PUT",
                  code: "204",
                  color: "#a78bfa",
                  dir: "up",
                  duration: 5.5,
                  delay: 0.7,
                },
                {
                  method: "GET",
                  code: "304",
                  color: "#22d3ee",
                  dir: "down",
                  duration: 7.0,
                  delay: 2.1,
                },
                {
                  method: "DELETE",
                  code: "204",
                  color: "#f87171",
                  dir: "up",
                  duration: 5.0,
                  delay: 1.6,
                },
                {
                  method: "PATCH",
                  code: "200",
                  color: "#34d399",
                  dir: "down",
                  duration: 4.4,
                  delay: 0.4,
                },
                {
                  method: "GET",
                  code: "200",
                  color: "#22d3ee",
                  dir: "up",
                  duration: 6.5,
                  delay: 1.9,
                },
                {
                  method: "POST",
                  code: "401",
                  color: "#fbbf24",
                  dir: "down",
                  duration: 5.8,
                  delay: 0.9,
                },
                {
                  method: "GET",
                  code: "404",
                  color: "#22d3ee",
                  dir: "up",
                  duration: 7.2,
                  delay: 2.5,
                },
                {
                  method: "PUT",
                  code: "200",
                  color: "#a78bfa",
                  dir: "down",
                  duration: 6.0,
                  delay: 0.3,
                },
                {
                  method: "GET",
                  code: "500",
                  color: "#22d3ee",
                  dir: "up",
                  duration: 5.3,
                  delay: 1.1,
                },
              ].map((t, i) => (
                <div key={i} class="relative flex-1 max-w-18 min-w-11" style="container-type: size">
                  <div
                    class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-linear-to-b from-transparent via-base-content/10 to-transparent"
                    style={`animation: lane-pulse ${
                      t.duration * 1.3
                    }s ease-in-out ${t.delay}s infinite`}
                  />
                  <div
                    class="absolute left-1/2 -translate-x-1/2 top-1.5 w-1 h-1 rounded-full"
                    style={`background:${t.color}66;box-shadow:0 0 6px ${t.color}80`}
                  />
                  <div
                    class="absolute left-1/2 -translate-x-1/2 bottom-1.5 w-1 h-1 rounded-full"
                    style={`background:${t.color}66;box-shadow:0 0 6px ${t.color}80`}
                  />
                  <div
                    class="absolute left-1/2 -translate-x-1/2 px-1.5 py-0.75 rounded-[3px] font-mono text-[10px] font-bold whitespace-nowrap pointer-events-none"
                    style={`color:${t.color};background:${t.color}10;border:1px solid ${t.color}55;box-shadow:0 0 12px ${t.color}40, inset 0 0 1px ${t.color};animation: packet-${t.dir} ${t.duration}s linear ${t.delay}s infinite;`}
                  >
                    {t.method} {t.code}
                  </div>
                </div>
              ))}
            </div>
            <div
              class="absolute z-5 w-56 h-56 rounded-full pointer-events-none"
              style="background: radial-gradient(circle, oklch(var(--b1)) 0%, oklch(var(--b1)/0.85) 45%, transparent 75%)"
            />
            <img
              src="/logo.svg"
              alt="Howl"
              class="relative z-10 w-40 h-40"
              style="filter: drop-shadow(0 0 32px oklch(var(--p)/0.5)) drop-shadow(0 0 80px oklch(var(--p)/0.25))"
            />
          </div>

          <div class="animate-fade-up-2 text-center mb-4">
            <h1 class="text-6xl lg:text-7xl font-bold tracking-tight leading-none">
              {title.toUpperCase()}
            </h1>
            <p class="mt-4 text-base-content/50 text-base tracking-[0.25em] uppercase font-bold">
              Web Framework · Type-Safe · Deno
            </p>
          </div>

          <p class="animate-fade-up-3 text-base-content/60 text-center max-w-lg text-lg leading-relaxed mb-10">
            Backend-first full-stack framework for Deno. Typed endpoints, SSR islands, built-in
            RBAC, and middleware that propagates to every response.
          </p>

          {/* Quick Start grid */}
          <div class="animate-fade-up-4 w-full max-w-4xl mb-16">
            <p class="text-center font-black text-xs uppercase tracking-[0.3em] text-base-content/40 mb-8">
              Get started in minutes
            </p>
            <div class="grid grid-cols-[1fr_56px_1fr] grid-rows-[260px_auto_260px] gap-y-1">
              {/* 01 · install */}
              <div class="h-full flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-primary/5 overflow-hidden">
                <div class="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
                  <span class="w-2.5 h-2.5 rounded-full bg-error/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-success/70" />
                  <span class="ml-2 font-mono text-xs text-zinc-400">01 · install</span>
                </div>
                <div class="flex-1 px-5 py-5 font-mono text-[14px] flex flex-col gap-3">
                  <div>
                    <span class="text-violet-400 select-none">$</span>
                    <span class="text-zinc-200">deno add</span>
                  </div>
                  <div class="text-emerald-400 font-medium pl-3">jsr:@hushkey/howl</div>
                  <div class="text-zinc-700 select-none leading-none tracking-widest">
                    ─────────────────
                  </div>
                  <div class="text-zinc-400 leading-relaxed text-[13px]">
                    Deno · Fresh · Preact<br />
                    <span class="text-zinc-500">esbuild · Zod · TailwindCSS</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-center">
                <svg
                  class="w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </div>
              {/* 02 · configure */}
              <div class="h-full flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-primary/5 overflow-hidden">
                <div class="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
                  <span class="w-2.5 h-2.5 rounded-full bg-error/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-success/70" />
                  <span class="ml-2 font-mono text-xs text-zinc-400">02 · configure</span>
                </div>
                <div class="flex-1 px-5 py-5 font-mono text-[14px] flex flex-col gap-1.5">
                  <div class="text-zinc-500 text-[12px] mb-1">{`// howl.config.ts`}</div>
                  <div>
                    <span class="text-violet-400">export const</span>
                    <span class="text-zinc-200">{" { defineApi } ="}</span>
                  </div>
                  <div class="pl-3">
                    <span class="text-amber-400">defineConfig</span>
                    <span class="text-zinc-200">{"<State, Role>({"}</span>
                  </div>
                  <div class="pl-6">
                    <span class="text-zinc-300">roles,</span>
                  </div>
                  <div class="pl-6">
                    <span class="text-zinc-300">cache:</span>
                    <span class="text-violet-400">new</span>
                    <span class="text-cyan-400">memoryCache</span>
                    <span class="text-zinc-200">(),</span>
                  </div>
                  <div class="pl-3 text-zinc-200">{"})"}</div>
                </div>
              </div>
              <div class="flex items-center justify-center py-2">
                <svg
                  class="w-6 h-6 text-primary rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75"
                  />
                </svg>
              </div>
              <div class="flex items-center justify-center">
                <span class="font-mono text-[10px] text-primary/40 tracking-[0.3em] uppercase">
                  4 steps
                </span>
              </div>
              <div class="flex items-center justify-center py-2">
                <svg
                  class="w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75"
                  />
                </svg>
              </div>
              {/* 04 · pages */}
              <div class="h-full flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-primary/5 overflow-hidden">
                <div class="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
                  <span class="w-2.5 h-2.5 rounded-full bg-error/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-success/70" />
                  <span class="ml-2 font-mono text-xs text-zinc-400">04 · pages</span>
                </div>
                <div class="flex-1 px-5 py-5 font-mono text-[14px] flex flex-col gap-1.5">
                  <div class="text-zinc-500 text-[12px] mb-1">{`// client/pages/index.tsx`}</div>
                  <div>
                    <span class="text-violet-400">export default function</span>
                    <span class="text-amber-400">Index</span>
                    <span class="text-zinc-200">(</span>
                  </div>
                  <div class="pl-4">
                    <span class="text-zinc-300">ctx:</span>
                    <span class="text-cyan-400">Context</span>
                    <span class="text-zinc-200">{"<State>"}</span>
                  </div>
                  <div class="text-zinc-200">{"): JSX.Element {"}</div>
                  <div class="pl-4 text-zinc-200">return (</div>
                  <div class="pl-8">
                    <span class="text-zinc-200">{"<h1>"}</span>
                    <span class="text-emerald-400">{"{"}</span>
                    <span class="text-zinc-200">ctx.state.client.title</span>
                    <span class="text-emerald-400">{"}"}</span>
                    <span class="text-zinc-200">{"</h1>"}</span>
                  </div>
                  <div class="pl-4 text-zinc-200">)</div>
                  <div class="text-zinc-200">{"}"}</div>
                  <div class="mt-auto text-zinc-500 text-[12px] pt-3 border-t border-zinc-800/60">
                    <span class="text-success/80">→</span> state flows from middleware → page
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-center">
                <svg
                  class="w-6 h-6 text-primary rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </div>
              {/* 03 · server */}
              <div class="h-full flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-primary/5 overflow-hidden">
                <div class="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
                  <span class="w-2.5 h-2.5 rounded-full bg-error/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span class="w-2.5 h-2.5 rounded-full bg-success/70" />
                  <span class="ml-2 font-mono text-xs text-zinc-400">03 · server</span>
                </div>
                <div class="flex-1 px-5 py-5 font-mono text-[14px] flex flex-col gap-1.5">
                  <div class="text-zinc-500 text-[12px] mb-1">{`// server/main.ts`}</div>
                  <div>
                    <span class="text-violet-400">const</span>
                    <span class="text-zinc-200">app =</span>
                    <span class="text-violet-400">new</span>
                    <span class="text-cyan-400">Howl</span>
                    <span class="text-zinc-200">{"<State>()"}</span>
                  </div>
                  <div class="mt-2">
                    <span class="text-zinc-200">app.</span>
                    <span class="text-amber-400">configure</span>
                    <span class="text-zinc-200">(middleware)</span>
                  </div>
                  <div>
                    <span class="text-zinc-200">app.</span>
                    <span class="text-amber-400">fsApiRoutes</span>
                    <span class="text-zinc-200">(apiConfig)</span>
                  </div>
                  <div>
                    <span class="text-zinc-200">app.</span>
                    <span class="text-amber-400">fsClientRoutes</span>
                    <span class="text-zinc-200">()</span>
                  </div>
                  <div class="mt-auto text-zinc-500 text-[12px] pt-3 border-t border-zinc-800/60">
                    <span class="text-success/80">→</span> filesystem is the router
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What Howl adds */}
          <div class="animate-fade-up-5 w-full max-w-4xl mt-20">
            <div class="text-center mb-8">
              <p class="font-mono text-xs uppercase tracking-[0.3em] text-base-content/40 mb-3">
                What {title} adds on top of Fresh
              </p>
              <p class="font-mono font-black text-4xl text-primary tracking-tight leading-none">
                v{version}
              </p>
            </div>
            <div class="grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-primary/10 overflow-hidden">
              {FEATURES.map(({ label, desc }, i) => (
                <div
                  key={label}
                  class={`px-5 py-6 font-mono text-[13px] ${
                    i < 3 ? "border-b border-zinc-800" : ""
                  }`}
                >
                  <p class="text-[11px] uppercase tracking-[0.2em] mb-3 font-bold text-primary">
                    {label}
                  </p>
                  <p class="text-zinc-400 text-[12px] leading-relaxed font-sans">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
