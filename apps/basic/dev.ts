import { Howl } from "@hushkey/howl";
import { HowlBuilder } from "@hushkey/howl/dev";
import { tailwindPlugin } from "@hushkey/howl/plugins";
import type { State } from "./howl.config.ts";

const howl = new Howl<State>({ mode: "fullstack" });

const builder = new HowlBuilder(howl, {
  root: import.meta.dirname ?? "",
  importApp: async () => {
    const mod = await import("./main.ts");
    return mod.app.getApp();
  },
});

tailwindPlugin(builder.getBuilder("default")!);

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen();
}
