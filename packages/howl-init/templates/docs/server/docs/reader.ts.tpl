import manifestJson from "./manifest.json" with { type: "json" };
import gettingStarted from "./getting-started.json" with { type: "json" };
// Add more docs here:
// import myTopic from "./my-topic.json" with { type: "json" };

export type BlockType =
  | { type: "p"; text: string }
  | { type: "code"; lang: string; text: string; filename?: string }
  | { type: "h3"; text: string }
  | { type: "tip"; text: string }
  | { type: "warning"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface DocSection {
  id: string;
  heading: string;
  blocks: BlockType[];
}

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  sections: DocSection[];
}

export interface ManifestItem {
  slug: string;
  title: string;
  description: string;
  order: number;
}

const DOC_REGISTRY: Record<string, DocPage> = {
  "getting-started": gettingStarted as unknown as DocPage,
  // Register more docs here. The key must match the `slug` in manifest.json:
  // "my-topic": myTopic as unknown as DocPage,
};

export function readManifest(): ManifestItem[] {
  return (manifestJson as ManifestItem[]).sort((a, b) => a.order - b.order);
}

export function readDoc(slug: string): DocPage | null {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  return DOC_REGISTRY[safe] ?? null;
}
