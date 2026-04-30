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
      scaffold({ templateId: "docs", targetDir: target, projectName: "occupied" }),
    ).rejects.toThrow(/not empty/);
  });
});

Deno.test("scaffold succeeds when target dir exists but is empty", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "empty");
    await Deno.mkdir(target);
    await scaffold({ templateId: "docs", targetDir: target, projectName: "empty" });
    expect(await exists(join(target, "server/main.ts"))).toBe(true);
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

Deno.test("scaffold copies the cv template (profile + projects + project detail)", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "my-cv");
    await scaffold({
      templateId: "cv",
      targetDir: target,
      projectName: "my-cv",
    });

    expect(await exists(join(target, "deno.json"))).toBe(true);
    expect(await exists(join(target, "dev.ts"))).toBe(true);
    expect(await exists(join(target, "howl.config.ts"))).toBe(true);
    expect(await exists(join(target, "tailwind.config.ts"))).toBe(true);
    expect(await exists(join(target, "server/main.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/ping.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/profile.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/projects.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/project-item.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/cv/profile.json"))).toBe(true);
    expect(await exists(join(target, "server/cv/reader.ts"))).toBe(true);
    expect(await exists(join(target, "server/cv/projects/manifest.json"))).toBe(true);
    expect(await exists(join(target, "server/cv/projects/howl.json"))).toBe(true);
    expect(await exists(join(target, "server/cv/projects/hushkey.json"))).toBe(true);
    expect(await exists(join(target, "server/cv/projects/edge-router.json"))).toBe(true);
    expect(await exists(join(target, "client/pages/_app.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/_layout.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/_error.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/index.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/projects/index.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/projects/[slug].tsx"))).toBe(true);
    expect(await exists(join(target, "static/style.css"))).toBe(true);
    expect(await exists(join(target, "static/logo.svg"))).toBe(true);
    expect(await exists(join(target, ".gitignore"))).toBe(true);
    expect(await exists(join(target, ".env.example"))).toBe(true);
    expect(await exists(join(target, "README.md"))).toBe(true);

    const denoJson = await Deno.readTextFile(join(target, "deno.json"));
    expect(denoJson).toContain('"name": "my-cv"');
    expect(denoJson).toContain("daisyui");

    const compileTask = JSON.parse(denoJson).tasks.compile as string;
    expect(compileTask).toContain("./dist/bin/my-cv");

    const profile = JSON.parse(
      await Deno.readTextFile(join(target, "server/cv/profile.json")),
    );
    expect(profile.skills).toBeInstanceOf(Array);
    expect(profile.experience).toBeInstanceOf(Array);

    const projects = JSON.parse(
      await Deno.readTextFile(join(target, "server/cv/projects/manifest.json")),
    );
    expect(projects).toBeInstanceOf(Array);
    expect(projects.length).toBeGreaterThan(0);
  });
});

Deno.test("scaffold copies the backend-only template (api-only with ping + pong)", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "my-backend");
    await scaffold({
      templateId: "backend-only",
      targetDir: target,
      projectName: "my-backend",
    });

    expect(await exists(join(target, "deno.json"))).toBe(true);
    expect(await exists(join(target, "dev.ts"))).toBe(true);
    expect(await exists(join(target, "howl.config.ts"))).toBe(true);
    expect(await exists(join(target, "server/main.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/ping.api.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/pong.api.ts"))).toBe(true);
    expect(await exists(join(target, ".gitignore"))).toBe(true);
    expect(await exists(join(target, ".env.example"))).toBe(true);
    expect(await exists(join(target, "README.md"))).toBe(true);

    expect(await exists(join(target, "client"))).toBe(false);
    expect(await exists(join(target, "static"))).toBe(false);
    expect(await exists(join(target, "tailwind.config.ts"))).toBe(false);

    const denoJson = await Deno.readTextFile(join(target, "deno.json"));
    expect(denoJson).toContain('"name": "my-backend"');
    expect(denoJson).not.toContain("daisyui");
    expect(denoJson).not.toContain("tailwindcss");
    expect(denoJson).not.toContain("preact");
    expect(denoJson).not.toContain("jsxPrecompileSkipElements");

    const compileTask = JSON.parse(denoJson).tasks.compile as string;
    expect(compileTask).toContain("./dist/bin/my-backend");

    const pong = await Deno.readTextFile(join(target, "server/apis/public/pong.api.ts"));
    expect(pong).toContain('method: "POST"');
    expect(pong).toContain("requestBody:");
  });
});

Deno.test("scaffold copies the fullstack template (api + page + island + component)", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "my-fs");
    await scaffold({
      templateId: "fullstack",
      targetDir: target,
      projectName: "my-fs",
    });

    expect(await exists(join(target, "deno.json"))).toBe(true);
    expect(await exists(join(target, "dev.ts"))).toBe(true);
    expect(await exists(join(target, "howl.config.ts"))).toBe(true);
    expect(await exists(join(target, "tailwind.config.ts"))).toBe(true);
    expect(await exists(join(target, "static/style.css"))).toBe(true);
    expect(await exists(join(target, "server/main.ts"))).toBe(true);
    expect(await exists(join(target, "server/apis/public/ping.api.ts"))).toBe(true);
    expect(await exists(join(target, "client/pages/_app.tsx"))).toBe(true);
    expect(await exists(join(target, "client/pages/index.tsx"))).toBe(true);
    expect(await exists(join(target, "client/islands/Counter.island.tsx"))).toBe(true);
    expect(await exists(join(target, "client/components/Counter.tsx"))).toBe(true);

    const denoJson = await Deno.readTextFile(join(target, "deno.json"));
    expect(denoJson).toContain('"name": "my-fs"');
    expect(denoJson).toContain("@preact/signals");
    expect(denoJson).toContain("daisyui");
    expect(denoJson).toContain("jsxPrecompileSkipElements");

    const counter = await Deno.readTextFile(join(target, "client/components/Counter.tsx"));
    expect(counter).toContain("useSignal");

    const island = await Deno.readTextFile(join(target, "client/islands/Counter.island.tsx"));
    expect(island).toContain("Counter");
  });
});

Deno.test("scaffold replaces {{PROJECT_NAME}} in .tpl files", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "acme");
    await scaffold({
      templateId: "docs",
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
