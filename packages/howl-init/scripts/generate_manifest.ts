import { walk } from "@std/fs";
import { fromFileUrl, relative } from "@std/path";

const templatesDir = fromFileUrl(new URL("../templates/", import.meta.url));
const manifestPath = new URL("../templates/manifest.json", import.meta.url);

const manifest: Record<string, string[]> = {};

for await (const entry of walk(templatesDir, { includeDirs: false, includeFiles: true })) {
  const rel = relative(templatesDir, entry.path).replaceAll("\\", "/");
  if (rel === "manifest.json") continue;
  const slash = rel.indexOf("/");
  if (slash === -1) continue;
  const templateId = rel.slice(0, slash);
  const filePath = rel.slice(slash + 1);
  (manifest[templateId] ??= []).push(filePath);
}

for (const id of Object.keys(manifest)) manifest[id].sort();

const sorted: Record<string, string[]> = {};
for (const id of Object.keys(manifest).sort()) sorted[id] = manifest[id];

await Deno.writeTextFile(
  fromFileUrl(manifestPath),
  JSON.stringify(sorted, null, 2) + "\n",
);

const total = Object.values(sorted).reduce((n, files) => n + files.length, 0);
console.log(`wrote manifest: ${Object.keys(sorted).length} templates, ${total} files`);
