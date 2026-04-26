import { expect } from "@std/expect";
import { makeApp, text } from "../harness.ts";

Deno.test("middleware — runs in registration order, can short-circuit", async () => {
  const t = makeApp<{ trace: string[] }>();
  t.app.use((ctx) => {
    (ctx.state as { trace: string[] }).trace = ["a"];
    return ctx.next();
  });
  t.app.use((ctx) => {
    (ctx.state as { trace: string[] }).trace.push("b");
    return ctx.next();
  });
  t.app.get("/", (ctx) => {
    (ctx.state as { trace: string[] }).trace.push("c");
    return ctx.json({ trace: (ctx.state as { trace: string[] }).trace });
  });

  const res = await t.fetch("/");
  expect(await res.json()).toEqual({ trace: ["a", "b", "c"] });
});

Deno.test("middleware — ctx.next() returns response from next handler", async () => {
  const t = makeApp();
  t.app.use(async (ctx) => {
    const res = await ctx.next();
    res.headers.set("X-Wrapped", "1");
    return res;
  });
  t.app.get("/", (ctx) => ctx.text("inner"));

  const res = await t.fetch("/");
  expect(res.headers.get("X-Wrapped")).toBe("1");
  expect(await text(res)).toBe("inner");
});

Deno.test("middleware — path-scoped use propagates to descendant routes", async () => {
  const t = makeApp();
  let hits = 0;
  t.app.use("/admin", (ctx) => {
    hits++;
    return ctx.next();
  });
  t.app.get("/admin/dashboard", (ctx) => ctx.text("admin"));
  t.app.get("/public", (ctx) => ctx.text("pub"));

  await t.fetch("/admin/dashboard");
  expect(hits).toBe(1);

  await t.fetch("/public");
  expect(hits).toBe(1);
});

Deno.test("middleware — trailing /* on use() pattern matches descendants too", async () => {
  const t = makeApp();
  let hits = 0;
  t.app.use("/admin/*", (ctx) => {
    hits++;
    return ctx.next();
  });
  t.app.get("/admin/dashboard", (ctx) => ctx.text("admin"));
  t.app.get("/admin/users/list", (ctx) => ctx.text("users"));
  t.app.get("/public", (ctx) => ctx.text("pub"));

  await t.fetch("/admin/dashboard");
  await t.fetch("/admin/users/list");
  expect(hits).toBe(2);

  await t.fetch("/public");
  expect(hits).toBe(2);
});

Deno.test("middleware — ctx.headers persist into the final response", async () => {
  const t = makeApp();
  t.app.use((ctx) => {
    ctx.headers.set("X-Trace-Id", "abc");
    return ctx.next();
  });
  t.app.get("/", (ctx) => ctx.json({ ok: true }));

  const res = await t.fetch("/");
  expect(res.headers.get("X-Trace-Id")).toBe("abc");
});

Deno.test("middleware — thrown HttpError yields plain-text status response", async () => {
  const t = makeApp();
  const { HttpError } = await import("../../core/error.ts");
  t.app.get("/boom", () => {
    throw new HttpError(418, "I'm a teapot");
  });

  const res = await t.fetch("/boom");
  expect(res.status).toBe(418);
  expect(await text(res)).toBe("I'm a teapot");
});

Deno.test("middleware — HttpError without message falls back to canonical status text", async () => {
  const t = makeApp();
  const { HttpError } = await import("../../core/error.ts");
  t.app.get("/missing", () => {
    throw new HttpError(404);
  });

  const res = await t.fetch("/missing");
  expect(res.status).toBe(404);
  expect(await text(res)).toBe("Not Found");
});

Deno.test("middleware — thrown non-HttpError returns 500", async () => {
  const t = makeApp();
  t.app.get("/boom", () => {
    throw new Error("kaboom");
  });

  const originalError = console.error;
  console.error = () => {};
  try {
    const res = await t.fetch("/boom");
    expect(res.status).toBe(500);
    expect(await text(res)).toBe("Internal server error");
  } finally {
    console.error = originalError;
  }
});

Deno.test("middleware — chained ctx.json merges headers", async () => {
  const t = makeApp();
  t.app.use((ctx) => {
    ctx.headers.set("X-A", "1");
    return ctx.next();
  });
  t.app.get("/", (ctx) => ctx.json({ ok: true }, { headers: { "X-B": "2" } }));

  const res = await t.fetch("/");
  expect(res.headers.get("X-A")).toBe("1");
  expect(res.headers.get("X-B")).toBe("2");
  expect(res.headers.get("Content-Type")).toContain("application/json");
});
