import { Harmony } from "@harmony/core";
import { HarmonyBuilder } from "@harmony/dev";
import { tailwindPlugin } from "@harmony/plugins";

const harmony = new Harmony({ mode: "fullstack" });

const builder = new HarmonyBuilder(harmony, {
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
