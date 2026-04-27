import type { Context } from "@hushkey/howl";
import type { State } from "../../../howl.config.ts";
import ClientSafeIsland from "../../islands/client-safe.island.tsx";

export default function Docs(_ctx: Context<State>) {
  return (
    <>
      <h1 class="text-5xl font-bold mb-4">Docs</h1>
      <ClientSafeIsland />
      {/* loading some react just for no sense */}
    </>
  );
}
