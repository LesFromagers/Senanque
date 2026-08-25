/**
 * The five practices, in the order drawn left to right in the homepage
 * arcade (components/home/PracticeArcade.tsx) — Theology centered under
 * the belfry. Also drives the "Selected work" filter tabs (ProjectGrid),
 * so a bay and a tab always name the same five things in the same
 * order. A project's category not among these five (e.g. Coffee's
 * "Consumption") simply never surfaces under a specific tab — it still
 * shows under "All".
 */
export const PRACTICES = [
  { label: "Economics", short: "Econ" },
  { label: "Sports", short: "Sports" },
  { label: "Theology", short: "Theology" },
  { label: "Art", short: "Art" },
  { label: "Games", short: "Games" },
] as const;

export type PracticeLabel = (typeof PRACTICES)[number]["label"];
