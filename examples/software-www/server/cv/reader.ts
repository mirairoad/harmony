import profileJson from "./profile.json" with { type: "json" };
import projectsManifest from "./projects/manifest.json" with { type: "json" };
import howlProject from "./projects/howl.json" with { type: "json" };
import hushkeyProject from "./projects/hushkey.json" with { type: "json" };
import houndProject from "./projects/hound.json" with { type: "json" };
// Add more projects here:
// import myProject from "./projects/my-project.json" with { type: "json" };

/** Reusable block types used inside project detail JSON files. */
export type BlockType =
  | { type: "p"; text: string }
  | { type: "code"; lang: string; text: string; filename?: string }
  | { type: "h3"; text: string }
  | { type: "tip"; text: string }
  | { type: "warning"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

/** A named section inside a project detail page. */
export interface ProjectSection {
  id: string;
  heading: string;
  blocks: BlockType[];
}

/** External link surfaced on a project detail page. */
export interface ProjectLink {
  label: string;
  url: string;
}

/** Full project detail. */
export interface ProjectPage {
  slug: string;
  title: string;
  tagline: string;
  year: number;
  role: string;
  stack: string[];
  links: ProjectLink[];
  sections: ProjectSection[];
}

/**
 * Lifecycle status of a product:
 * - `shipped` — released and available (most products)
 * - `production` — actively running in production with real users
 * - `development` — under active development, not yet live
 * - `archived` — no longer maintained
 */
export type ProjectStatus =
  | "shipped"
  | "production"
  | "development"
  | "archived";

/** Card-level project info shown on the gallery and the home grid. */
export interface ProjectCard {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  year: number;
  url?: string;
  repo?: string;
  accent: "primary" | "secondary" | "accent" | "info" | "success" | "warning";
  status: ProjectStatus;
  order: number;
}

/** External link displayed on a profile or team member card. */
export interface ProfileSocial {
  label: string;
  handle: string;
  url: string;
}

/** A single team member. */
export interface TeamMember {
  name: string;
  role: string;
  handle?: string;
  url?: string;
  initials: string;
  accent: "primary" | "secondary" | "accent" | "info" | "success" | "warning";
  /** Short paragraph shown on the dedicated /team page. */
  bio?: string;
}

/** Top-level studio profile shape. */
export interface Profile {
  name: string;
  studio: string;
  kicker: string;
  tagline: string;
  location: string;
  email: string;
  social: ProfileSocial[];
  about: string[];
  team: TeamMember[];
}

const PROJECT_REGISTRY: Record<string, ProjectPage> = {
  "howl": howlProject as unknown as ProjectPage,
  "hushkey": hushkeyProject as unknown as ProjectPage,
  "hound": houndProject as unknown as ProjectPage,
  // Register more projects here. The key must match the `slug` in projects/manifest.json:
  // "my-project": myProject as unknown as ProjectPage,
};

/** Returns the parsed profile.json. */
export function readProfile(): Profile {
  return profileJson as unknown as Profile;
}

/** Returns all projects in display order (lowest `order` first). */
export function readProjects(): ProjectCard[] {
  return (projectsManifest as ProjectCard[])
    .slice()
    .sort((a, b) => a.order - b.order);
}

/** Returns the detail JSON for a single project, or null if the slug is unknown. */
export function readProject(slug: string): ProjectPage | null {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  return PROJECT_REGISTRY[safe] ?? null;
}
