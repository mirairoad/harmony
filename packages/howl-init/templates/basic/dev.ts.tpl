import { HowlBuilder } from "@hushkey/howl/dev";
import { app } from "./main.ts";
import type { State } from "./howl.config.ts";

const builder = new HowlBuilder<State>(app, {
  root: import.meta.dirname ?? "",
  importApp: () => app,
  outDir: "dist",
  serverEntry: "./main.ts",
  clientEntry: "./pages/_app.ts",
});

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen();
}
