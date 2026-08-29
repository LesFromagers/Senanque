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
 * Two places this module still deliberately departs from the brief's
 * formula as literally written, because the literal version needs data
 * this project doesn't have and never fabricates:
 *
 * 1. SOS-adjusted margin (iterative SRS). Needs every opponent's own
 *    season game log, a second-order pull explicitly out of scope for the
 *    pulls this pipeline currently runs (see gap_report_verified_batch.md).
 *    No season in this dataset has it yet. When `sosAdjustedMargin` is
 *    null, its 30% of the Performance layer is redistributed
 *    proportionally across the other three sub-components rather than
 *    treated as zero — and the season is flagged, not silently scored as
 *    if SOS were average.
 * 2. Offense/defense efficiency's data-tier waterfall. CLAUDE.md's tier
 *    2 (yards/play, ~1950s+) and a genuine tier 3 (yards/game vs.
 *    national rank, pre-1950s) both need OU's own historical yards
 *    figures — no source in this pipeline (Wikipedia infoboxes, CFBD,
 *    NCAA's *national* averages) supplies OU's own per-season yardage
 *    before 2005. scripts/heisman_ledger/schema.py's data_tier_for()
 *    documents this directly: tier 2 has never been reachable in
 *    practice, and today's "tier 3" is really a conference-known
 *    heuristic layered over the same points-per-game proxy as tier 4, not
 *    an actual yards-based measure. So in practice every season is either
 *    tier 1 (CFBD PPA, 2005+) or the points-per-game proxy (everything
 *    else) — see `offenseEfficiencyRaw`/`defenseEfficiencyRaw` below. What
 *    *is* fixed here: those two proxies are z-scored against separate
 *    populations (see `zScoreWithinProxy`), never pooled into one
 *    z-score the way the previous version of this file did — PPA
 *    (roughly -1..1) and points-per-game (roughly 0..50) are different
 *    scales, and pooling them let unit differences masquerade as real
 *    quality differences.
 *
 * The point-differential z-score is no longer one of these deviations:
 * CLAUDE.md calls for it vs. the national average that season, and this
 * file now does that, sourced from lib/heisman-ledger/national-baseline.ts
 * (populated by scripts/heisman_ledger/pull_ncaa.py, NCAA-archived
 * national scoring/yardage averages, 1937-present). Two honest caveats
 * remain, both surfaced per-season in `gaps` rather than absorbed
 * silently:
 *   - Pre-1937 seasons, or any season the NCAA pull hasn't reached yet,
 *     have no national baseline entry and fall back to z-scoring OU's
 *     margin against OU's *own* season-to-season distribution instead —
 *     the same method this file used everywhere before this update.
 *   - NCAA's archived pages mostly publish the national *average* alone,
 *     not a full team-by-team table for every historical season, so a
 *     real national standard deviation isn't always available even when
 *     the mean is. When only the mean is available, this file centers on
 *     the real national average but scales by OU's own historical spread
 *     rather than fabricate a national one.
 *
 * Every one of these is surfaced per-season in `PowerIndexResult.gaps`,
 * per CLAUDE.md's "a visible gap indicator... incompleteness is never
 * silently hidden" requirement — never absorbed quietly into the number.
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
  sosZ: (number | null)[];
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
  const sos = seasons.map((s) => s.sosAdjustedMargin ?? null);
  return {
    pointDiffZ: computePointDiffZ(seasons, nationalBaselines),
    sosZ: zScores(sos),
    offEffZ: zScoreWithinProxy(seasons.map(offenseEfficiencyRaw)),
    defEffZ: zScoreWithinProxy(seasons.map(defenseEfficiencyRaw)),
  };
}

const PERFORMANCE_WEIGHTS = {
  pointDiff: 0.5,
  sos: 0.3,
  offEff: 0.1,
  defEff: 0.1,
};

/** Combines the four sub-component z-scores, redistributing any missing sub-component's weight proportionally rather than treating it as zero. */
function combinePerformance(sub: {
  pointDiff: number | null;
  sos: number | null;
  offEff: number | null;
  defEff: number | null;
}): number | null {
  const entries = [
    { key: "pointDiff", value: sub.pointDiff, weight: PERFORMANCE_WEIGHTS.pointDiff },
    { key: "sos", value: sub.sos, weight: PERFORMANCE_WEIGHTS.sos },
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
      sos: perf.sosZ[i],
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
    } else if (perf.pointDiffZ[i].source === "national_mean_ou_spread") {
      gaps.push(
        `point-diff z-score is centered on the real NCAA national average for ${season.year}, but scaled by OU's own historical spread — the NCAA source doesn't supply a national cross-team standard deviation for this season`,
      );
    }
    if (perf.sosZ[i] === null) gaps.push("SOS-adjusted margin (SRS) not computed — opponent season-game-logs not yet pulled for this season");
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
