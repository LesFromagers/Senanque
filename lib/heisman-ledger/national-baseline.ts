import "server-only";
import baselineJson from "@/data/heisman-ledger/national_baseline.json";

/**
 * NCAA-sourced national per-season baseline for era-normalizing the Power
 * Index's point-differential z-score — CLAUDE.md: "point differential
 * z-score vs. national average that season." Populated by
 * scripts/heisman_ledger/pull_ncaa.py from NCAA.com/NCAA.org archived team
 * stats. Coverage starts 1937 — the NCAA's own official stat-keeping
 * start, a real historical limit, not a research gap (see CLAUDE.md);
 * seasons before it, and any season the pull hasn't reached yet, simply
 * have no entry here.
 *
 * `meanMarginPerGame` is the national average scoring margin per game that
 * season (national mean points-for minus national mean points-against —
 * a valid identity regardless of how teams pair up, so it only needs each
 * side's national average, not a full paired distribution).
 *
 * `stdDevMarginPerGame` is only ever populated when the NCAA source
 * actually supports computing a real cross-team spread for that season
 * (i.e. every major-college team's own per-game scoring figures were
 * pulled for that year, not just the national average). NCAA's archived
 * pages mostly publish the average alone, not a full team-by-team table
 * for every historical season — when the spread isn't available,
 * power-index.ts centers on this file's real national mean but scales by
 * OU's own historical spread instead of fabricating a national one. See
 * that file's header comment for the full fallback chain.
 */
export interface NationalBaseline {
  year: number;
  meanMarginPerGame: number | null;
  stdDevMarginPerGame: number | null;
  /** Where this row came from — an NCAA.com/NCAA.org URL, ideally. */
  source: string;
}

type RawBaselineEntry = Omit<NationalBaseline, "year">;
type RawBaselineJson = Record<string, RawBaselineEntry>;

const baselines = baselineJson as RawBaselineJson;

export function getNationalBaseline(year: number): NationalBaseline | null {
  const entry = baselines[String(year)];
  if (!entry) return null;
  return { year, ...entry };
}

/** Keyed by year (number) for cheap lookup — power-index.ts consumes this shape. */
export function getAllNationalBaselines(): Record<number, NationalBaseline> {
  const result: Record<number, NationalBaseline> = {};
  for (const [yearStr, entry] of Object.entries(baselines)) {
    const year = Number(yearStr);
    result[year] = { year, ...entry };
  }
  return result;
}
