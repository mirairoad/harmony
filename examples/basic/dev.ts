import { HowlBuilder } from "@hushkey/howl/dev";
import { tailwindPlugin } from "@hushkey/howl/plugins";
import { app } from "./main.ts";
import { State } from "./howl.config.ts";

const builder = new HowlBuilder<State>(app, {
  root: import.meta.dirname ?? "",
  importApp: () => Promise.resolve(app),
  outDir: "dist",
});

tailwindPlugin(builder.getBuilder("default")!);

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen();
}
