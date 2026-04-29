import profileJson from "./profile.json" with { type: "json" };
import projectsManifest from "./projects/manifest.json" with { type: "json" };
import howlProject from "./projects/howl.json" with { type: "json" };
import hushkeyProject from "./projects/hushkey.json" with { type: "json" };
import edgeRouterProject from "./projects/edge-router.json" with { type: "json" };
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

/** Card-level project info shown on the gallery and the home featured strip. */
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
  featured: boolean;
  order: number;
}

/** Profile pieces are loosely typed — most consumers want the structured shape. */
export interface ProfileSocial {
  label: string;
  handle: string;
  url: string;
}

/** Skill grouping shown on the home page. */
export interface SkillGroup {
  category: string;
  items: string[];
}

/** A single role on the experience timeline. */
export interface ExperienceItem {
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  summary: string;
  highlights: string[];
}

/** A single education entry. */
export interface EducationItem {
  school: string;
  degree: string;
  start: string;
  end: string;
}

/** Top-level profile shape. */
export interface Profile {
  name: string;
  title: string;
  tagline: string;
  location: string;
  email: string;
  available: string;
  social: ProfileSocial[];
  about: string[];
  skills: SkillGroup[];
  experience: ExperienceItem[];
  education: EducationItem[];
}

const PROJECT_REGISTRY: Record<string, ProjectPage> = {
  "howl": howlProject as unknown as ProjectPage,
  "hushkey": hushkeyProject as unknown as ProjectPage,
  "edge-router": edgeRouterProject as unknown as ProjectPage,
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

/** Returns featured projects only — used by the home page strip. */
export function readFeaturedProjects(): ProjectCard[] {
  return readProjects().filter((p) => p.featured);
}

/** Returns the detail JSON for a single project, or null if the slug is unknown. */
export function readProject(slug: string): ProjectPage | null {
  const safe = slug.replace(/[^a-z0-9-]/g, "");
  return PROJECT_REGISTRY[safe] ?? null;
}
