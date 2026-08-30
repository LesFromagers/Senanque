/**
 * The Heisman Park Ledger's Power Index — a reusable scoring module, not
 * inline page logic, because it needs to re-run every time a gapped field
 * gets manually corrected. See CLAUDE.md for the formula spec this
 * implements:
 *
 *   Power Index = 0.50 * Performance Layer
 *              + 0.35 * Accomplishment Layer
 *              + 0.15 * Talent Layer
 *
 * The Accomplishment and Talent layers live in their own files —
 * accomplishment-scoring.ts and talent-scoring.ts — matching CLAUDE.md's
 * "point table in lib/heisman-ledger/..." file layout. This file owns the
 * Performance layer, the tiebreaker, and combining all three into the
 * final composite.
 *
 * -- Performance layer, as actually defined here (see PERFORMANCE_WEIGHTS):
 *   point-differential z-score (5/7) + offense/defense efficiency
 *   z-scores (1/7 each). An SRS-style strength-of-schedule margin was
 *   part of an earlier draft of this formula (30% of this layer) and has
 *   been dropped, deliberately, not left half-built: computing it for
 *   real needs every OU opponent's own full season game log across 130
 *   years, a second-order pull (fetch every opponent-team-season, not
 *   just OU's) this pipeline has no source for and no near-term plan to
 *   build (see gap_report_verified_batch.md's original scoping of it).
 *   Carrying a formally-weighted component that can only ever be null and
 *   silently redistributed was worse than not having it: every one of
 *   this dataset's seasons was already computed with SOS redistributed
 *   away, so removing it outright changes zero scores and removes a gap
 *   flag that was never describing a fixable-per-season problem. The
 *   `sosAdjustedMargin` field this used to read has been removed from
 *   SeasonRecord entirely along with it. If a real opponent-adjusted-
 *   margin pull ever gets built, it belongs back in this formula as a
 *   deliberate re-addition, not a silent revival.
 *
 * One place this module still deliberately departs from the brief's
 * formula as literally written, because the literal version needs data
 * this project doesn't have and never fabricates: offense/defense
 * efficiency's data-tier waterfall. CLAUDE.md's tier 2 (yards/play,
 * ~1950s+) and a genuine tier 3 (yards/game vs. national rank,
 * pre-1950s) both need OU's own historical yards figures — no source in
 * this pipeline (Wikipedia infoboxes, CFBD, NCAA's *national* averages)
 * supplies OU's own per-season yardage before 2005.
 * scripts/heisman_ledger/schema.py's data_tier_for() documents this
 * directly: tier 2 has never been reachable in practice, and today's
 * "tier 3" is really a conference-known heuristic layered over the same
 * points-per-game proxy as tier 4, not an actual yards-based measure. So
 * in practice every season is either tier 1 (CFBD PPA, 2005+) or the
 * points-per-game proxy (everything else) — see
 * `offenseEfficiencyRaw`/`defenseEfficiencyRaw` below. What *is* fixed
 * here: those two proxies are z-scored against separate populations (see
 * `zScoreWithinProxy`), never pooled into one z-score the way an earlier
 * version of this file did — PPA (roughly -1..1) and points-per-game
 * (roughly 0..50) are different scales, and pooling them let unit
 * differences masquerade as real quality differences.
 *
 * The point-differential z-score is vs. the national average that
 * season, per CLAUDE.md, sourced from
 * lib/heisman-ledger/national-baseline.ts (populated by
 * scripts/heisman_ledger/pull_ncaa.py, NCAA-archived national scoring/
 * yardage averages, 1937-present). Centering on the real national mean
 * but *scaling* by OU's own historical spread is this formula's defined
 * method for every season that has a national mean at all (1937-present)
 * — not a fallback awaiting a better data source. NCAA's archived pages
 * publish the national average alone, never a full team-by-team table
 * for a historical season, so a real cross-team standard deviation isn't
 * obtainable without a team-by-team pull across 100+ programs and ~90
 * years — a materially bigger undertaking than anything else this
 * pipeline runs, deliberately not being built for the same reason SOS
 * isn't (see above). If that ever changes, `computePointDiffZ` below
 * already has the "national" branch ready to use a real stddev the
 * moment national-baseline.ts's `stdDevMarginPerGame` is non-null for a
 * season, no formula change required. Only one case still gets flagged
 * in `gaps`: a pre-1937 season (or any season the NCAA pull hasn't
 * reached), which has no national baseline at all — not even a mean —
 * and falls back to z-scoring OU's margin against OU's own historical
 * distribution instead. That's a real, distinct gap (CLAUDE.md's
 * documented 1937 historical limit), not the same thing as the
 * mean-only case above.
 *
 * Every remaining case above is surfaced per-season in
 * `PowerIndexResult.gaps`, per CLAUDE.md's "a visible gap indicator...
 * incompleteness is never silently hidden" requirement — never absorbed
 * quietly into the number.
 */
import type { PowerIndexResult, SeasonRecord } from "./types";
import { getAllNationalBaselines, type NationalBaseline } from "./national-baseline";
import { computeAccomplishmentScore } from "./accomplishment-scoring";
import { computeTalentScore } from "./talent-scoring";

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

/** z-score of each value against the population's own mean/std-dev. Missing input passes through as null. */
function zScores(values: (number | null)[]): (number | null)[] {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) return values.map(() => null);
  const avg = mean(present);
  const sd = stdDev(present, avg);
  if (sd === 0) return values.map((v) => (v === null ? null : 0));
  return values.map((v) => (v === null ? null : (v - avg) / sd));
}

/** Rescales a z-score distribution to 0-100 by min-max on the z-scores themselves. */
function zScoresTo0to100(zs: (number | null)[]): (number | null)[] {
  const present = zs.filter((z): z is number => z !== null);
  if (present.length === 0) return zs.map(() => null);
  const min = Math.min(...present);
  const max = Math.max(...present);
  if (max === min) return zs.map((z) => (z === null ? null : 50));
  return zs.map((z) => (z === null ? null : ((z - min) / (max - min)) * 100));
}

// ---------------------------------------------------------------------------
// Layer 1 — Performance (50% of composite)
// ---------------------------------------------------------------------------

type PointDiffSource = "national" | "national_mean_ou_spread" | "ou_self_referential" | null;

interface PointDiffZ {
  z: number | null;
  source: PointDiffSource;
}

interface PerformanceSubScores {
  pointDiffZ: PointDiffZ[];
  offEffZ: (number | null)[];
  defEffZ: (number | null)[];
}

function pointDifferentialPerGame(season: SeasonRecord): number | null {
  if (season.pointsFor === null || season.pointsAgainst === null) return null;
  const games = gamesPlayed(season);
  if (!games) return null;
  return (season.pointsFor - season.pointsAgainst) / games;
}

function gamesPlayed(season: SeasonRecord): number | null {
  if (!season.finalRecord) return null;
  const match = season.finalRecord.match(/^(\d+)-(\d+)(?:-(\d+))?/);
  if (!match) return null;
  const [, w, l, t] = match;
  return Number(w) + Number(l) + Number(t ?? 0);
}

/**
 * Point-differential z-score vs. the national average that season, per
 * CLAUDE.md, using lib/heisman-ledger/national-baseline.ts. Falls back to
 * z-scoring OU's margin against OU's own historical distribution when no
 * national baseline exists for that year (pre-1937, or not yet pulled) —
 * see this file's header comment for the full chain, including the
 * mean-only fallback when NCAA has no national spread for that season.
 */
function computePointDiffZ(seasons: SeasonRecord[], nationalBaselines: Record<number, NationalBaseline>): PointDiffZ[] {
  const margins = seasons.map(pointDifferentialPerGame);
  const present = margins.filter((m): m is number => m !== null);
  const ouMean = present.length ? mean(present) : 0;
  const ouStdDev = present.length ? stdDev(present, ouMean) : 0;

  return seasons.map((season, i) => {
    const margin = margins[i];
    if (margin === null) return { z: null, source: null };

    const baseline = nationalBaselines[season.year];
    if (!baseline || baseline.meanMarginPerGame === null) {
      const z = ouStdDev === 0 ? 0 : (margin - ouMean) / ouStdDev;
      return { z, source: "ou_self_referential" };
    }

    const centered = margin - baseline.meanMarginPerGame;
    if (baseline.stdDevMarginPerGame !== null && baseline.stdDevMarginPerGame !== 0) {
      return { z: centered / baseline.stdDevMarginPerGame, source: "national" };
    }
    const z = ouStdDev === 0 ? 0 : centered / ouStdDev;
    return { z, source: "national_mean_ou_spread" };
  });
}

type EfficiencyProxy = "ppa" | "points_per_game";

interface EfficiencyRaw {
  proxy: EfficiencyProxy | null;
  value: number | null;
}

/**
 * Offensive/defensive efficiency, tiered by whatever this season's
 * data_tier actually has available — never invented for a season whose
 * tier doesn't support it. Tier 1 uses CFBD PPA; every other tier falls
 * back to points-per-game/against, the only efficiency proxy this
 * pipeline can source pre-2005 without fabricating a number. See this
 * file's header comment for why a real yards-based tier 2/3 isn't wired
 * in.
 */
function offenseEfficiencyRaw(season: SeasonRecord): EfficiencyRaw {
  if (season.dataTier === 1 && season.offensePpa !== null) return { proxy: "ppa", value: season.offensePpa };
  const games = gamesPlayed(season);
  if (season.pointsFor === null || !games) return { proxy: null, value: null };
  return { proxy: "points_per_game", value: season.pointsFor / games };
}

function defenseEfficiencyRaw(season: SeasonRecord): EfficiencyRaw {
  // Lower is better on both CFBD defensive PPA and points allowed, so both
  // get negated before z-scoring — "better defense" should z-score positive.
  if (season.dataTier === 1 && season.defensePpa !== null) return { proxy: "ppa", value: -season.defensePpa };
  const games = gamesPlayed(season);
  if (season.pointsAgainst === null || !games) return { proxy: null, value: null };
  return { proxy: "points_per_game", value: -(season.pointsAgainst / games) };
}

/**
 * Z-scores each season's raw efficiency figure against only the *other*
 * seasons sharing the same proxy — never pooled across proxies. See this
 * file's header comment for why: PPA and points-per-game sit on
 * incompatible numeric scales, so a single pooled z-score would let unit
 * differences masquerade as quality differences.
 */
function zScoreWithinProxy(raws: EfficiencyRaw[]): (number | null)[] {
  const result: (number | null)[] = raws.map(() => null);
  const proxies = new Set(raws.map((r) => r.proxy).filter((p): p is EfficiencyProxy => p !== null));
  for (const proxy of proxies) {
    const indices = raws.map((r, i) => (r.proxy === proxy ? i : -1)).filter((i) => i !== -1);
    const zs = zScores(indices.map((i) => raws[i].value));
    indices.forEach((origIndex, j) => {
      result[origIndex] = zs[j];
    });
  }
  return result;
}

function computePerformanceSubScores(
  seasons: SeasonRecord[],
  nationalBaselines: Record<number, NationalBaseline>,
): PerformanceSubScores {
  return {
    pointDiffZ: computePointDiffZ(seasons, nationalBaselines),
    offEffZ: zScoreWithinProxy(seasons.map(offenseEfficiencyRaw)),
    defEffZ: zScoreWithinProxy(seasons.map(defenseEfficiencyRaw)),
  };
}

// 5:1:1 -- the same ratio point-diff:offEff:defEff already had before SOS
// was removed (0.5:0.1:0.1), just renormalized to sum to 1 on its own
// instead of via combinePerformance()'s runtime redistribution. Every
// season in this dataset already had SOS redistributed away (see this
// file's header comment), so this is a no-op on every existing score --
// pure simplification, not a formula change in practice.
const PERFORMANCE_WEIGHTS = {
  pointDiff: 5 / 7,
  offEff: 1 / 7,
  defEff: 1 / 7,
};

/** Combines the three sub-component z-scores, redistributing any missing sub-component's weight proportionally rather than treating it as zero. */
function combinePerformance(sub: {
  pointDiff: number | null;
  offEff: number | null;
  defEff: number | null;
}): number | null {
  const entries = [
    { key: "pointDiff", value: sub.pointDiff, weight: PERFORMANCE_WEIGHTS.pointDiff },
    { key: "offEff", value: sub.offEff, weight: PERFORMANCE_WEIGHTS.offEff },
    { key: "defEff", value: sub.defEff, weight: PERFORMANCE_WEIGHTS.defEff },
  ].filter((e) => e.value !== null);
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  return entries.reduce((sum, e) => sum + (e.value as number) * (e.weight / totalWeight), 0);
}

// ---------------------------------------------------------------------------
// Tiebreaker
// ---------------------------------------------------------------------------

const TIEBREAK_THRESHOLD = 1.0;

function tiebreakCompare(a: PowerIndexResult & { raw: SeasonRecord; pointDiffZ: number | null }, b: typeof a): number {
  if (Math.abs(a.powerIndex - b.powerIndex) >= TIEBREAK_THRESHOLD) {
    return b.powerIndex - a.powerIndex;
  }
  const texasRank = (v: SeasonRecord) => (v.beatTexas === "TRUE" ? 1 : 0);
  if (texasRank(b.raw) !== texasRank(a.raw)) return texasRank(b.raw) - texasRank(a.raw);
  const osuRank = (v: SeasonRecord) => (v.beatOsu === "TRUE" ? 1 : 0);
  if (osuRank(b.raw) !== osuRank(a.raw)) return osuRank(b.raw) - osuRank(a.raw);
  return (b.pointDiffZ ?? -Infinity) - (a.pointDiffZ ?? -Infinity);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function computePowerIndex(seasons: SeasonRecord[]): PowerIndexResult[] {
  if (seasons.length === 0) return [];

  const nationalBaselines = getAllNationalBaselines();
  const perf = computePerformanceSubScores(seasons, nationalBaselines);
  const rawPerformance = seasons.map((_, i) =>
    combinePerformance({
      pointDiff: perf.pointDiffZ[i].z,
      offEff: perf.offEffZ[i],
      defEff: perf.defEffZ[i],
    }),
  );
  const performanceLayer = zScoresTo0to100(rawPerformance);

  const accomplishments = seasons.map(computeAccomplishmentScore);
  const talentRaw = seasons.map(computeTalentScore);
  const maxTalent = Math.max(...talentRaw.map((t) => t.points), 1);

  const results = seasons.map((season, i) => {
    const gaps: string[] = [];

    if (perf.pointDiffZ[i].z === null) {
      gaps.push("point differential not computable (missing points_for/points_against or final record)");
    } else if (perf.pointDiffZ[i].source === "ou_self_referential") {
      gaps.push(
        `point-diff z-score uses OU's own historical spread — no NCAA national baseline for ${season.year} yet (pre-1937 limit, or the NCAA pull hasn't reached this season)`,
      );
    }
    // Centering on the real NCAA national mean but scaling by OU's own
    // historical spread (source "national_mean_ou_spread") is this
    // formula's defined method, not a shortfall — see this file's header
    // comment — so it's not flagged here the way the self-referential
    // fallback above is.
    if (perf.offEffZ[i] === null) gaps.push("offensive efficiency not computable for this season's data tier");
    if (perf.defEffZ[i] === null) gaps.push("defensive efficiency not computable for this season's data tier");
    if (season.pointsForIsApproximate || season.pointsAgainstIsApproximate) {
      gaps.push("points_for/points_against is a partial-season total (see source notes) — treated as-is, not as a confirmed final total");
    }
    gaps.push(...accomplishments[i].flags);
    gaps.push(...talentRaw[i].flags);

    const talentLayer = (talentRaw[i].points / maxTalent) * 100;
    const performance = performanceLayer[i] ?? 0;
    if (performanceLayer[i] === null) gaps.push("performance layer has no computable sub-components — scored as 0, not omitted");

    const powerIndex = 0.5 * performance + 0.35 * accomplishments[i].points + 0.15 * talentLayer;

    return {
      year: season.year,
      powerIndex: Math.round(powerIndex * 10) / 10,
      performanceLayer: Math.round(performance * 10) / 10,
      accomplishmentLayer: Math.round(accomplishments[i].points * 10) / 10,
      talentLayer: Math.round(talentLayer * 10) / 10,
      pointDifferentialPerGame: pointDifferentialPerGame(season),
      rank: 0, // assigned below, after tiebreak sort
      gaps,
      raw: season,
      pointDiffZ: perf.pointDiffZ[i].z,
    };
  });

  results.sort(tiebreakCompare);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results.map((r) => ({
    year: r.year,
    powerIndex: r.powerIndex,
    performanceLayer: r.performanceLayer,
    accomplishmentLayer: r.accomplishmentLayer,
    talentLayer: r.talentLayer,
    pointDifferentialPerGame: r.pointDifferentialPerGame,
    rank: r.rank,
    gaps: r.gaps,
  }));
}
