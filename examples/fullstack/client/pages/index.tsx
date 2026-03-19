import type { Context } from "@hushkey/howl";
import type { State } from "../../howl.config.ts";
import ClientSafeIsland from "../islands/client-safe.island.tsx";

export default function Index(ctx: Context<State>) {
  console.log("ctx:", ctx.state);
  return (
    <>
      <h1 class="text-5xl font-bold mb-4">Howl! + TailwindCSS</h1>
      <ClientSafeIsland />
    </>
  );
}
