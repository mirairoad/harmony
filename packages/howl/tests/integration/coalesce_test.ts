import { expect } from "@std/expect";
import { coalesceRequests } from "../../core/middlewares/coalesce.ts";
import { makeApp } from "../harness.ts";

Deno.test("coalesceRequests — concurrent GETs to same URL run handler once", async () => {
  const t = makeApp();
  let runs = 0;
  t.app.use(coalesceRequests());
  t.app.get("/slow", async (ctx) => {
    runs++;
    await new Promise((r) => setTimeout(r, 20));
    return ctx.json({ runs });
  });

  const [a, b, c] = await Promise.all([
    t.fetch("/slow"),
    t.fetch("/slow"),
    t.fetch("/slow"),
  ]);

  expect(runs).toBe(1);
  expect(await a.json()).toEqual({ runs: 1 });
  expect(await b.json()).toEqual({ runs: 1 });
  expect(await c.json()).toEqual({ runs: 1 });
});

Deno.test("coalesceRequests — requests with cookies are not coalesced", async () => {
  const t = makeApp();
  let runs = 0;
  t.app.use(coalesceRequests());
  t.app.get("/", async (ctx) => {
    runs++;
    await new Promise((r) => setTimeout(r, 10));
    return ctx.text(String(runs));
  });

  await Promise.all([
    t.fetch("/", { headers: { Cookie: "a=1" } }),
    t.fetch("/", { headers: { Cookie: "a=1" } }),
  ]);

  expect(runs).toBe(2);
});

Deno.test("coalesceRequests — POST requests are never coalesced", async () => {
  const t = makeApp();
  let runs = 0;
  t.app.use(coalesceRequests());
  t.app.post("/", async (ctx) => {
    runs++;
    await new Promise((r) => setTimeout(r, 10));
    return ctx.text(String(runs));
  });

  await Promise.all([
    t.fetch("/", { method: "POST" }),
    t.fetch("/", { method: "POST" }),
  ]);

  expect(runs).toBe(2);
});
