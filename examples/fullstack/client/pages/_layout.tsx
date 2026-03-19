import type { FunctionComponent, JSX } from "preact";

export default function ({ Component }: { Component: FunctionComponent }): JSX.Element {
  return (
    <>
      <div class="navbar bg-base-200">
        <div class="navbar-start">
          <a href="/" class="btn btn-ghost text-xl">🐺 Howl</a>
        </div>
        <div class="navbar-end">
          <a href="/" class="btn btn-ghost btn-sm">Home</a>
          <a href="/docs" class="btn btn-ghost btn-sm">Docs</a>
        </div>
      </div>
      <main>
        <Component />
      </main>
    </>
  );
}
