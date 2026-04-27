import type { Context } from "@hushkey/howl";
import type { State } from "../howl.config.ts";

export default function Index(_ctx: Context<State>) {
  return (
    <div style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem;">
      <h1>🐺 Welcome to Howl</h1>
      <p>Edit <code>pages/index.tsx</code> to start building.</p>
      <ul>
        <li>API route example: <a href="/api/public/ping">/api/public/ping</a></li>
        <li>Edit <code>main.ts</code> to wire middlewares.</li>
        <li>Edit <code>howl.config.ts</code> for shared state, roles, and cache.</li>
      </ul>
    </div>
  );
}
