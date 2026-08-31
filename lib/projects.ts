/**
 * Central project registry — the single source of truth the homepage
 * renders from. Adding a project means adding an entry here (plus the
 * route + data source it points at), never hand-editing the homepage.
 * See CLAUDE.md's "Adding a new project" recipe.
 */
export type Wing = "analytics" | "agentics";
export type ProjectStatus = "live" | "planned" | "rebuild";
/** Shape of the homepage card's thumbnail — see components/home/ProjectCard.tsx.
 * "bars" is the generic fallback for a live project that hasn't earned its
 * own preview yet; it carries no specific claim about the real dashboard's
 * layout, unlike "bars-trend" and "table" which are meant to echo one. */
export type PreviewStyle = "bars" | "bars-trend" | "table";

export interface ProjectMeta {
  slug: string;
  title: string;
  wing: Wing;
  category: string;
  description: string;
  dataSource: string;
  status: ProjectStatus;
  preview?: PreviewStyle;
}

export const projects: ProjectMeta[] = [
  {
    slug: "bailey-bros",
    title: "Bailey Bros. Economic Barometer",
    wing: "analytics",
    category: "Economics",
    description:
      "Fed funds, CPI, unemployment, the S&P 500, sentiment, the yield spread, and the Oklahoma index — read against real thresholds.",
    dataSource: "FRED API",
    status: "live",
    preview: "bars-trend",
  },
  {
    slug: "heisman-park-ledger",
    title: "The Heisman Park Ledger",
    wing: "analytics",
    category: "Sports",
    description:
      "A Power Index for every Oklahoma Sooners football season since 1895, normalized across eras.",
    dataSource: "Wikipedia API + collegefootballdata.com API",
    status: "live",
    preview: "table",
  },
  {
    slug: "coffee",
    title: "Coffee Consumption",
    wing: "analytics",
    category: "Consumption",
    description:
      "The first version used fabricated data. It stays down until the real source is wired in.",
    dataSource: "Personal log / public dataset",
    status: "rebuild",
  },
  {
    slug: "chess",
    title: "The Dantès Gambit",
    wing: "agentics",
    category: "Games",
    description: "A chess coach with a Count of Monte Cristo twist.",
    dataSource: "None — local engine, session-only",
    status: "live",
  },
];

export function getProject(wing: Wing, slug: string): ProjectMeta | undefined {
  return projects.find((p) => p.wing === wing && p.slug === slug);
}

export function projectsByWing(wing: Wing): ProjectMeta[] {
  return projects.filter((p) => p.wing === wing);
}
