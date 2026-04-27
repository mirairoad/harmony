import { App } from "../../../core/app.ts";

export const app = new App().get(
  "/",
  () => new Response("hello"),
);
