/**
 * Registry of templates the scaffolder can produce.
 */
export interface TemplateMeta {
  /** Folder name under `templates/` and CLI flag value. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  /** One-line description shown next to the label. */
  description: string;
}

/** Templates currently shipped. Add an entry plus a `templates/<id>/` folder to expose a new one. */
export const templates: readonly TemplateMeta[] = [
  {
    id: "docs",
    label: "docs",
    description: "Tailwind + daisyUI docs site with JSON-driven content",
  },
  {
    id: "cv",
    label: "cv",
    description: "Tailwind + daisyUI developer CV / portfolio with project cards",
  },
] as const;

/** Look up a template by id. Returns `undefined` if unknown. */
export function findTemplate(id: string): TemplateMeta | undefined {
  return templates.find((t) => t.id === id);
}
