import type { JSX } from "preact/jsx-runtime";
import CounterIsland from "../islands/Counter.island.tsx";

export default function Home(): JSX.Element {
  return (
    <main class="min-h-screen flex items-center justify-center px-4 bg-base-100">
      <div class="flex flex-col items-center gap-8 max-w-md text-center">
        <header class="flex flex-col gap-2">
          <h1 class="text-4xl font-bold tracking-tight">{{PROJECT_NAME}}</h1>
          <p class="text-base-content/70">
            Server-rendered page with a hydrated island. Edit{" "}
            <code class="font-mono text-sm bg-base-200 px-1.5 py-0.5 rounded">
              client/islands/Counter.island.tsx
            </code>
            {" "}and the click handler keeps working.
          </p>
        </header>

        <CounterIsland start={0} label="clicks" />

        <a
          href="/api/public/ping"
          class="link link-primary text-sm font-mono"
          target="_blank"
          rel="noopener"
        >
          GET /api/public/ping →
        </a>
      </div>
    </main>
  );
}
