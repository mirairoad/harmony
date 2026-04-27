import { walk } from "@std/fs";
import { fromFileUrl, relative } from "@std/path";

const templatesDir = fromFileUrl(new URL("../templates/", import.meta.url));
const manifestPath = new URL("../templates/manifest.json", import.meta.url);
const howlDenoJsonPath = fromFileUrl(new URL("../../howl/deno.json", import.meta.url));

const howlDenoJson = JSON.parse(await Deno.readTextFile(howlDenoJsonPath)) as { version: string };
const howlVersion = howlDenoJson.version;

const templateFiles: Record<string, string[]> = {};

for await (const entry of walk(templatesDir, { includeDirs: false, includeFiles: true })) {
  const rel = relative(templatesDir, entry.path).replaceAll("\\", "/");
  if (rel === "manifest.json") continue;
  const slash = rel.indexOf("/");
  if (slash === -1) continue;
  const templateId = rel.slice(0, slash);
  const filePath = rel.slice(slash + 1);
  (templateFiles[templateId] ??= []).push(filePath);
}

for (const id of Object.keys(templateFiles)) templateFiles[id].sort();

const sorted: Record<string, string[]> = {};
for (const id of Object.keys(templateFiles).sort()) sorted[id] = templateFiles[id];

const manifest = {
  howlVersion,
  templates: sorted,
};

await Deno.writeTextFile(
  fromFileUrl(manifestPath),
  JSON.stringify(manifest, null, 2) + "\n",
);

const total = Object.values(sorted).reduce((n, files) => n + files.length, 0);
console.log(
  `wrote manifest: ${Object.keys(sorted).length} templates, ${total} files (howl@${howlVersion})`,
);
