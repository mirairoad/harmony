import { expect } from "@std/expect";
import { Howl } from "../../core/app.ts";
import { setBuildCache } from "../../core/app.ts";
import { MockBuildCache } from "../../core/test_utils.ts";

async function withServer<T>(
  configure: (app: Howl<unknown>) => void,
  fn: (port: number) => Promise<T>,
): Promise<T> {
  const app = new Howl<unknown>();
  setBuildCache(app, new MockBuildCache([], "production"), "production");
  configure(app);

  const aborter = new AbortController();
  await using server = Deno.serve({
    port: 0,
    hostname: "127.0.0.1",
    signal: aborter.signal,
    onListen: () => {},
  }, app.handler());

  try {
    const { port } = server.addr as Deno.NetAddr;
    return await fn(port);
  } finally {
    aborter.abort();
    await server.finished;
  }
}

Deno.test("app.ws — non-websocket request returns 426", async () => {
  await withServer((app) => {
    app.ws("/ws", { open() {} });
  }, async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/ws`);
    expect(res.status).toBe(426);
    await res.body?.cancel();
  });
});

Deno.test("app.ws — fires open/message/close handlers", async () => {
  const events: string[] = [];

  await withServer((app) => {
    app.ws("/ws", {
      open() {
        events.push("server:open");
      },
      message(socket, event) {
        events.push(`server:message:${event.data}`);
        socket.send(`echo:${event.data}`);
      },
      close(_socket, code) {
        events.push(`server:close:${code}`);
      },
    });
  }, async (port) => {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      ws.addEventListener("open", () => ws.send("hello"));
      ws.addEventListener("message", (e) => {
        events.push(`client:message:${e.data}`);
        ws.close(1000, "bye");
      });
      ws.addEventListener("close", () => resolve());
      ws.addEventListener("error", () => reject(new Error("client error")));
    });
    // Allow server close handler to fire
    await new Promise((r) => setTimeout(r, 50));
  });

  expect(events).toContain("server:open");
  expect(events).toContain("server:message:hello");
  expect(events).toContain("client:message:echo:hello");
  expect(events).toContain("server:close:1000");
});

Deno.test("app.ws — port-bound endpoint is hidden from the main listener", async () => {
  const app = new Howl<unknown>();
  setBuildCache(app, new MockBuildCache([], "production"), "production");
  app.get("/health", (ctx) => ctx.text("ok"));
  app.ws("/ws", { open() {} }, { port: 9999 });

  // Main handler (no boundPort) should refuse the port-bound WS path.
  const mainHandler = app.handler();
  const wsRes = await mainHandler(new Request("http://localhost/ws"));
  expect(wsRes.status).toBe(404);
  await wsRes.body?.cancel();

  // Other routes still work on the main listener.
  const healthRes = await mainHandler(new Request("http://localhost/health"));
  expect(healthRes.status).toBe(200);
  await healthRes.body?.cancel();

  // Secondary handler (boundPort=9999) only serves the WS path.
  const wsListenerHandler = app.handler(9999);
  const blockedRes = await wsListenerHandler(new Request("http://localhost/health"));
  expect(blockedRes.status).toBe(404);
  await blockedRes.body?.cancel();

  // The WS path on the secondary listener is reachable (returns 426 because
  // the request lacks an Upgrade header — proves routing got there).
  const wsListenerRes = await wsListenerHandler(new Request("http://localhost/ws"));
  expect(wsListenerRes.status).toBe(426);
  await wsListenerRes.body?.cancel();
});

Deno.test("app.ws — middleware-set state is visible in handlers", async () => {
  let captured: string | undefined;

  await withServer((app) => {
    app.use((ctx) => {
      // deno-lint-ignore no-explicit-any
      (ctx.state as any).userId = "user-42";
      return ctx.next();
    });
    app.ws("/ws", {
      open(_socket, ctx) {
        // deno-lint-ignore no-explicit-any
        captured = (ctx.state as any).userId;
      },
    });
  }, async (port) => {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      ws.addEventListener("open", () => ws.close(1000, "done"));
      ws.addEventListener("close", () => resolve());
      ws.addEventListener("error", () => reject(new Error("client error")));
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  expect(captured).toBe("user-42");
});
