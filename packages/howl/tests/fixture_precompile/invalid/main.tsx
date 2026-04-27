import { Howl } from "../../../core/app.ts";

export const app = new Howl().get(
  "/",
  () => new Response("hello"),
);
