import { expect } from "@std/expect";
import { join } from "@std/path";
import { mapName, scaffold } from "../src/scaffold.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "howl-init-test-" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

Deno.test("mapName strips .tpl suffix", () => {
  expect(mapName("deno.json.tpl")).toEqual({ destRel: "deno.json", isTemplate: true });
  expect(mapName("README.md.tpl")).toEqual({ destRel: "README.md", isTemplate: true });
});

Deno.test("mapName renames gitignore to .gitignore", () => {
  expect(mapName("gitignore")).toEqual({ destRel: ".gitignore", isTemplate: false });
});

Deno.test("mapName renames env.example to .env.example", () => {
  expect(mapName("env.example")).toEqual({ destRel: ".env.example", isTemplate: false });
});

Deno.test("mapName preserves nested paths", () => {
  expect(mapName("pages/index.tsx")).toEqual({ destRel: "pages/index.tsx", isTemplate: false });
  expect(mapName("a/b/c.tpl")).toEqual({ destRel: "a/b/c", isTemplate: true });
});

Deno.test("mapName leaves regular files untouched", () => {
  expect(mapName("main.ts")).toEqual({ destRel: "main.ts", isTemplate: false });
});

Deno.test("scaffold copies the basic template into an empty target", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "my-app");
    await scaffold({
      templateId: "basic",
      targetDir: target,
      projectName: "my-app",
    });

    expect(await exists(join(target, "deno.json"))).toBe(true);
    expect(await exists(join(target, "main.ts"))).toBe(true);
    expect(await exists(join(target, "howl.config.ts"))).toBe(true);
    expect(await exists(join(target, "dev.ts"))).toBe(true);
    expect(await exists(join(target, "pages/index.tsx"))).toBe(true);
    expect(await exists(join(target, "pages/_app.tsx"))).toBe(true);
    expect(await exists(join(target, "pages/_layout.tsx"))).toBe(true);
    expect(await exists(join(target, "apis/public/ping.api.ts"))).toBe(true);
    expect(await exists(join(target, "static/.gitkeep"))).toBe(true);
    expect(await exists(join(target, ".gitignore"))).toBe(true);
    expect(await exists(join(target, "README.md"))).toBe(true);

    expect(await exists(join(target, "deno.json.tpl"))).toBe(false);
    expect(await exists(join(target, "gitignore"))).toBe(false);
    expect(await exists(join(target, "README.md.tpl"))).toBe(false);
  });
});

Deno.test("scaffold replaces {{PROJECT_NAME}} in .tpl files", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "acme");
    await scaffold({
      templateId: "basic",
      targetDir: target,
      projectName: "acme",
    });

    const denoJson = await Deno.readTextFile(join(target, "deno.json"));
    expect(denoJson).toContain('"name": "acme"');
    expect(denoJson).not.toContain("{{PROJECT_NAME}}");

    const readme = await Deno.readTextFile(join(target, "README.md"));
    expect(readme).toContain("# acme");
    expect(readme).not.toContain("{{PROJECT_NAME}}");
  });
});

Deno.test("scaffold leaves non-template files byte-identical", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "my-app");
    await scaffold({
      templateId: "basic",
      targetDir: target,
      projectName: "my-app",
    });

    const main = await Deno.readTextFile(join(target, "main.ts"));
    expect(main).toContain('import { Howl, staticFiles } from "@hushkey/howl"');
  });
});

Deno.test("scaffold rejects an unknown template id", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "x");
    await expect(
      scaffold({ templateId: "does-not-exist", targetDir: target, projectName: "x" }),
    ).rejects.toThrow(/Template not found/);
  });
});

Deno.test("scaffold refuses a non-empty target directory", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "occupied");
    await Deno.mkdir(target);
    await Deno.writeTextFile(join(target, "leftover.txt"), "hi");

    await expect(
      scaffold({ templateId: "basic", targetDir: target, projectName: "occupied" }),
    ).rejects.toThrow(/not empty/);
  });
});

Deno.test("scaffold succeeds when target dir exists but is empty", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "empty");
    await Deno.mkdir(target);
    await scaffold({ templateId: "basic", targetDir: target, projectName: "empty" });
    expect(await exists(join(target, "main.ts"))).toBe(true);
  });
});

Deno.test("scaffold copies the docs template (sample doc + reader + static assets)", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "my-docs");
    await scaffold({
      templateId: "docs",
      targetDir: target,
      projectName: "my-docs",
    });

    expect(await exists(join(target, "deno.json"))).toBe(true);
    expect(await exists(join(target, "dev.ts"))).toBe(true);
    expect(await exists(join(target, "howl.config.ts"))).toBe(true);
    expect(await exists(join(target, "tailwind.config.ts"))).toBe(true);
    expect(await exists(join(target, "server/main.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/ping.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/docs.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/docs-item.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/docs/manifest.json"))).toBe(true);
    expect(await exists(join(target, "server/docs/reader.ts"))).toBe(true);
    expect(await exists(join(target, "server/docs/getting-started.json"))).toBe(true);
    expect(await exists(join(target, "client/pages/_app.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/_layout.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/_error.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/index.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/docs/_layout.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/docs/index.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/docs/[slug].tsx"))).toBe(true);
    expect(await exists(join(target, "static/style.css"))).toBe(true);
    expect(await exists(join(target, "static/logo.svg"))).toBe(true);
    expect(await exists(join(target, ".gitignore"))).toBe(true);
    expect(await exists(join(target, ".env.example"))).toBe(true);
    expect(await exists(join(target, "README.md"))).toBe(true);

    const denoJson = await Deno.readTextFile(join(target, "deno.json"));
    expect(denoJson).toContain('"name": "my-docs"');
    expect(denoJson).toContain("daisyui");
    expect(denoJson).toContain("@tailwindcss/typography");

    const compileTask = JSON.parse(denoJson).tasks.compile as string;
    expect(compileTask).toContain("./dist/bin/my-docs");

    const env = await Deno.readTextFile(join(target, ".env.example"));
    expect(env).toContain("APP_NAME=");
    expect(env).toContain("DENO_PORT=");
  });
});

Deno.test("scaffold copies the with-store template (store + island)", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "store-app");
    await scaffold({
      templateId: "with-store",
      targetDir: target,
      projectName: "store-app",
    });

    expect(await exists(join(target, "state/store.ts"))).toBe(true);
    expect(await exists(join(target, "islands/counter.island.tsx"))).toBe(true);
    expect(await exists(join(target, "pages/index.tsx"))).toBe(true);

    const denoJson = await Deno.readTextFile(join(target, "deno.json"));
    expect(denoJson).toContain('"@preact/signals"');
    expect(denoJson).toContain('"name": "store-app"');
  });
});
