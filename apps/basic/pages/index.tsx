import type { Context } from "@harmony/core";
import type { State } from "../harmony.config.ts";
import ClientSafeIsland from "../islands/client-safe.island.tsx";

export default function Index(ctx: Context<State>) {
  console.log("ctx:", ctx.state);
  return (
    <>
      <h1 class="text-5xl font-bold mb-4">Harmony</h1>
      <ClientSafeIsland />
    </>
  );
}
