import { Head } from "@hushkey/howl/runtime";
import type { Context } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import type { JSX } from "preact/jsx-runtime";

export default function Index(ctx: Context<State>): JSX.Element {
  const title = ctx.state.client.title;
  const version = ctx.state.client.version;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={`${title} — documentation site built with Howl.`} />
      </Head>

      <div class="relative h-full bg-base-100 bg-dot-grid bg-size-[28px_28px] flex items-center justify-center overflow-hidden pt-20 sm:pt-24">
        <div class="relative z-10 px-6 py-10 max-w-2xl text-center">
          <img
            src="/logo.svg"
            alt={title}
            class="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-8"
            style="filter: drop-shadow(0 0 24px oklch(var(--p)/0.5))"
          />

          <p class="font-mono text-xs uppercase tracking-[0.3em] text-base-content/40 mb-3">
            v{version}
          </p>
          <h1 class="text-5xl sm:text-6xl font-bold tracking-tight leading-none mb-4">
            {title.toUpperCase()}
          </h1>
          <p class="text-base-content/60 text-base sm:text-lg leading-relaxed mb-10">
            Replace this page with your project's landing copy. Edit{" "}
            <code class="font-mono text-primary">client/pages/index.tsx</code>.
          </p>

          <div class="flex gap-3 justify-center flex-wrap">
            <a href="/docs" class="btn btn-primary btn-md rounded-xl text-base font-bold">
              Read the docs →
            </a>
            <a
              href="/api/public/ping"
              target="_blank"
              class="btn btn-outline btn-md rounded-xl text-base"
            >
              API ping
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
