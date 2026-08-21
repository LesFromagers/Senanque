/**
 * Central project registry — the single source of truth the homepage
 * renders from. Adding a project means adding an entry here (plus the
 * route + data source it points at), never hand-editing the homepage.
 * See CLAUDE.md's "Adding a new project" recipe.
 */
export type Wing = "analytics" | "agentics";
export type ProjectStatus = "live" | "planned" | "rebuild";

export interface ProjectMeta {
  slug: string;
  title: string;
  wing: Wing;
  category: string;
  description: string;
  dataSource: string;
  status: ProjectStatus;
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
  },
  {
    slug: "ou-rankings",
    title: "OU Rankings History",
    wing: "analytics",
    category: "Sport",
    description: "Every AP poll placement, tracked against season outcomes.",
    dataSource: "collegefootballdata.com API",
    status: "planned",
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
    title: "Chess",
    wing: "analytics",
    category: "Games",
    description: "A secondary build-things demo, not a headline project.",
    dataSource: "TBD",
    status: "planned",
  },
];

export function getProject(wing: Wing, slug: string): ProjectMeta | undefined {
  return projects.find((p) => p.wing === wing && p.slug === slug);
}

export function projectsByWing(wing: Wing): ProjectMeta[] {
  return projects.filter((p) => p.wing === wing);
}
