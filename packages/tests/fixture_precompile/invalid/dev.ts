import { Builder } from "../../../dev/builder.ts";

const builder = new Builder();

await builder.listen(() => import("./main.tsx"), {
  port: 4001,
});
