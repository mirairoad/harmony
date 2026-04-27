import { expect } from "@std/expect";
import { join } from "@std/path";
import { runInit } from "../mod.ts";
import type { PromptDeps, PromptOption } from "../src/prompt.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "howl-init-runtest-" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

function recordingPrompts(answers: { ask?: string[]; pick?: number[] }): {
  prompts: PromptDeps;
  asked: string[];
  picked: string[];
} {
  const askQueue = [...(answers.ask ?? [])];
  const pickQueue = [...(answers.pick ?? [])];
  const asked: string[] = [];
  const picked: string[] = [];
  const prompts: PromptDeps = {
    ask(question, defaultValue) {
      asked.push(question);
      const next = askQueue.shift();
      return (next ?? defaultValue ?? "").toString();
    },
    pick<T>(question: string, options: PromptOption<T>[]): T {
      picked.push(question);
      const idx = pickQueue.shift() ?? 0;
      return options[idx].value;
    },
  };
  return { prompts, asked, picked };
}

Deno.test("runInit with explicit name + template skips prompts", async () => {
  await withTempDir(async (dir) => {
    const { prompts, asked, picked } = recordingPrompts({});
    const result = await runInit({
      name: "my-app",
      template: "basic",
      cwd: dir,
      prompt: prompts,
    });

    expect(result.name).toBe("my-app");
    expect(result.template).toBe("basic");
    expect(result.path).toBe(join(dir, "my-app"));
    expect(asked).toEqual([]);
    expect(picked).toEqual([]);

    const stat = await Deno.stat(join(dir, "my-app", "main.ts"));
    expect(stat.isFile).toBe(true);
  });
});

Deno.test("runInit prompts for name when missing", async () => {
  await withTempDir(async (dir) => {
    const { prompts, asked } = recordingPrompts({ ask: ["from-prompt"] });
    const result = await runInit({
      template: "basic",
      cwd: dir,
      prompt: prompts,
    });

    expect(result.name).toBe("from-prompt");
    expect(asked.length).toBe(1);
    expect(await Deno.stat(join(dir, "from-prompt", "main.ts"))).toBeDefined();
  });
});

Deno.test("runInit always prompts for template when not given", async () => {
  await withTempDir(async (dir) => {
    const { prompts, picked } = recordingPrompts({ pick: [0] });
    const result = await runInit({
      name: "picks",
      cwd: dir,
      prompt: prompts,
    });

    expect(picked.length).toBe(1);
    expect(result.template).toBe("basic");
  });
});

Deno.test("runInit honours pick choice (with-store)", async () => {
  await withTempDir(async (dir) => {
    const { prompts } = recordingPrompts({ pick: [1] });
    const result = await runInit({
      name: "store-app",
      cwd: dir,
      prompt: prompts,
    });

    expect(result.template).toBe("with-store");
    expect(await Deno.stat(join(dir, "store-app", "state/store.ts"))).toBeDefined();
    expect(await Deno.stat(join(dir, "store-app", "islands/counter.island.tsx")))
      .toBeDefined();
  });
});

Deno.test("runInit honours pick choice (docs)", async () => {
  await withTempDir(async (dir) => {
    const { prompts } = recordingPrompts({ pick: [2] });
    const result = await runInit({
      name: "doc-site",
      cwd: dir,
      prompt: prompts,
    });

    expect(result.template).toBe("docs");
    expect(await Deno.stat(join(dir, "doc-site", "server/docs/getting-started.json")))
      .toBeDefined();
    expect(await Deno.stat(join(dir, "doc-site", "client/pages/docs/[slug].tsx")))
      .toBeDefined();
  });
});

Deno.test("runInit rejects unknown template id", async () => {
  await withTempDir(async (dir) => {
    await expect(
      runInit({ name: "x", template: "ghost", cwd: dir, prompt: recordingPrompts({}).prompts }),
    ).rejects.toThrow(/Unknown template/);
  });
});

Deno.test("runInit rejects invalid project names", async () => {
  await withTempDir(async (dir) => {
    await expect(
      runInit({ name: "../escape", cwd: dir, prompt: recordingPrompts({}).prompts }),
    ).rejects.toThrow(/Invalid project name/);
  });
});

Deno.test("runInit refuses to overwrite a non-empty existing folder", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "taken");
    await Deno.mkdir(target);
    await Deno.writeTextFile(join(target, "stuff.txt"), "x");

    await expect(
      runInit({ name: "taken", cwd: dir, prompt: recordingPrompts({}).prompts }),
    ).rejects.toThrow(/not empty/);
  });
});
