import { expect } from "@std/expect";
import * as path from "@std/path";
import {
  _clearPartialBoundaryCache,
  fileMentionsPartial,
  findPartialBoundary,
} from "../../dev/partial_boundary.ts";
import { fsAdapter } from "../../core/fs.ts";

async function withTempFiles(
  files: Record<string, string>,
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  _clearPartialBoundaryCache();
  const dir = await Deno.makeTempDir({ prefix: "howl-partial-" });
  try {
    for (const [rel, body] of Object.entries(files)) {
      const abs = path.join(dir, rel);
      await Deno.mkdir(path.dirname(abs), { recursive: true });
      await Deno.writeTextFile(abs, body);
    }
    await fn(dir);
  } finally {
    _clearPartialBoundaryCache();
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("fileMentionsPartial — detects JSX <Partial> with name prop", async () => {
  await withTempFiles({
    "_layout.tsx": `
      import { Partial } from "@hushkey/howl";
      export default function L({ Component }) {
        return <body><Partial name='main'><Component /></Partial></body>;
      }
    `,
  }, async (dir) => {
    expect(
      await fileMentionsPartial(fsAdapter, path.join(dir, "_layout.tsx")),
    ).toBe(true);
  });
});

Deno.test("fileMentionsPartial — detects self-closing <Partial /> form", async () => {
  await withTempFiles({
    "_layout.tsx": `<Partial name="main" />`,
  }, async (dir) => {
    expect(
      await fileMentionsPartial(fsAdapter, path.join(dir, "_layout.tsx")),
    ).toBe(true);
  });
});

Deno.test("fileMentionsPartial — detects h(Partial, ...) call form", async () => {
  await withTempFiles({
    "_layout.tsx": `
      import { h } from "preact";
      import { Partial } from "@hushkey/howl";
      export default function L({ Component }) {
        return h(Partial, { name: "main" }, h(Component, null));
      }
    `,
  }, async (dir) => {
    expect(
      await fileMentionsPartial(fsAdapter, path.join(dir, "_layout.tsx")),
    ).toBe(true);
  });
});

Deno.test("fileMentionsPartial — ignores commented-out Partial usage", async () => {
  await withTempFiles({
    "_layout.tsx": `
      // <Partial name="main"><Component /></Partial>
      /* <Partial name="aside" /> */
      export default function L({ Component }) {
        return <Component />;
      }
    `,
  }, async (dir) => {
    expect(
      await fileMentionsPartial(fsAdapter, path.join(dir, "_layout.tsx")),
    ).toBe(false);
  });
});

Deno.test("fileMentionsPartial — returns false when no Partial reference", async () => {
  await withTempFiles({
    "_layout.tsx": `
      export default function L({ Component }) {
        return <div><Component /></div>;
      }
    `,
  }, async (dir) => {
    expect(
      await fileMentionsPartial(fsAdapter, path.join(dir, "_layout.tsx")),
    ).toBe(false);
  });
});

Deno.test("findPartialBoundary — returns topmost file containing <Partial>", async () => {
  await withTempFiles({
    "_app.tsx": `export default function A({ Component }) { return <Component />; }`,
    "_layout.tsx": `
      import { Partial } from "@hushkey/howl";
      export default function L({ Component }) {
        return <Partial name='main'><Component /></Partial>;
      }
    `,
    "dashboard/_layout.tsx": `
      import { Partial } from "@hushkey/howl";
      export default function L({ Component }) {
        return <Partial name='inner'><Component /></Partial>;
      }
    `,
  }, async (dir) => {
    const chain = [
      path.join(dir, "_app.tsx"),
      path.join(dir, "_layout.tsx"),
      path.join(dir, "dashboard/_layout.tsx"),
    ];
    const boundary = await findPartialBoundary(fsAdapter, chain);
    expect(boundary).not.toBeNull();
    expect(boundary!.index).toBe(1);
    expect(boundary!.filePath).toBe(chain[1]);
  });
});

Deno.test("findPartialBoundary — returns null when no file has Partial", async () => {
  await withTempFiles({
    "_app.tsx": `export default function A({ Component }) { return <Component />; }`,
    "_layout.tsx": `export default function L({ Component }) { return <Component />; }`,
  }, async (dir) => {
    const boundary = await findPartialBoundary(fsAdapter, [
      path.join(dir, "_app.tsx"),
      path.join(dir, "_layout.tsx"),
    ]);
    expect(boundary).toBeNull();
  });
});

Deno.test("findPartialBoundary — picks _app.tsx when Partial lives there", async () => {
  await withTempFiles({
    "_app.tsx": `
      import { Partial } from "@hushkey/howl";
      export default function A({ Component }) {
        return <body><Partial name='main'><Component /></Partial></body>;
      }
    `,
    "_layout.tsx": `export default function L({ Component }) { return <Component />; }`,
  }, async (dir) => {
    const chain = [
      path.join(dir, "_app.tsx"),
      path.join(dir, "_layout.tsx"),
    ];
    const boundary = await findPartialBoundary(fsAdapter, chain);
    expect(boundary!.index).toBe(0);
  });
});
