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
 * `meanMarginPerGame` is always 0.0 wherever it's populated, and that's
 * not a placeholder — it's the actual value, for a real reason. The
 * NCAA's own record book publishes one national "Pts." column, not
 * separate national scoring-offense and scoring-defense averages,
 * because in a (near-)closed system every point one counted team scores
 * is a point some counted opponent allows — so the national average
 * points *scored* per team and *allowed* per team are essentially
 * identical, every season, by construction. The national average margin
 * genuinely is ~0; there's no per-season number to extract for it. What
 * this DOES change from the pre-this-file behavior: power-index.ts used
 * to center OU's point-diff z-score on OU's *own* historical average
 * margin; now it centers on a true neutral baseline (0 = an average
 * team), which is a real, defensible reading of CLAUDE.md's "vs. the
 * national average" — just simpler than it might look.
 *
 * `stdDevMarginPerGame` is always null. No accessible NCAA source
 * publishes a cross-team standard deviation of scoring margin — every
 * record-book edition gives the national average only. A real one would
 * need every counted team's own per-game figures for the season, a full
 * team-by-team pull across ~100 programs and ~90 years — a materially
 * bigger undertaking than anything else this pipeline runs, and (like the
 * SRS-style strength-of-schedule component power-index.ts dropped
 * outright rather than leave half-built) not being pursued. This isn't a
 * gap awaiting a fix: power-index.ts's header comment documents scaling
 * by OU's own historical spread as this formula's *defined* method for
 * every season with a national mean, not a fallback — so power-index.ts
 * centers on this file's real national mean and scales by OU's own
 * spread instead of fabricating a national one, and doesn't flag that
 * combination as incomplete. See that file's header comment for the one
 * case that's still genuinely flagged (no national baseline at all).
 *
 * The remaining fields are supplementary national context pulled from
 * the same table (national average points/game, total-offense
 * yards/game, yards/play, plays/game) — not consumed by the Power Index
 * today, kept here because scripts/heisman_ledger/pull_ncaa.py already
 * has them from the same source, and a future yards-based efficiency
 * tier (see power-index.ts's header comment on tiers 2/3) would want
 * them without a second pull.
 */
export interface NationalBaseline {
  year: number;
  meanMarginPerGame: number | null;
  stdDevMarginPerGame: number | null;
  nationalAvgPointsPerGame: number | null;
  nationalAvgTotalOffenseYardsPerGame: number | null;
  nationalAvgTotalOffenseYardsPerPlay: number | null;
  nationalAvgTotalOffensePlaysPerGame: number | null;
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
