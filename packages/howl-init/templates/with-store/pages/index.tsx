import type { Context } from "@hushkey/howl";
import type { State } from "../howl.config.ts";
import Counter from "../islands/counter.island.tsx";

export default function Index(_ctx: Context<State>) {
  return (
    <div style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem;">
      <h1>🐺 Howl + Signals Store</h1>
      <p>
        The counter below lives in <code>state/store.ts</code> and is rendered by an
        island in <code>islands/counter.island.tsx</code>.
      </p>
      <Counter />
      <p style="color: #666; font-size: 0.9rem;">
        Edit <code>state/store.ts</code> to add new signals — every island that
        imports them re-renders on change.
      </p>
    </div>
  );
}
