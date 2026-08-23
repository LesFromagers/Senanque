/**
 * The Heisman Park Ledger's Power Index — a reusable scoring module, not
 * inline page logic, because it needs to re-run every time a gapped field
 * gets manually corrected. See the Cowork brief for the formula spec this
 * implements:
 *
 *   Power Index = 0.50 * Performance Layer
 *              + 0.35 * Accomplishment Layer
 *              + 0.15 * Talent Layer
 *
 * Three places this module deliberately departs from the brief's formula
 * as literally written, because the literal version needs data this
 * project doesn't have and never fabricates:
 *
 * 1. Point-differential z-score. The brief specifies (OU margin - national
 *    average that season) / national std-dev that season. No source in
 *    this pipeline provides a national point-differential distribution for
 *    130 years of college football. This module z-scores OU's own
 *    point-differential-per-game against OU's *own* season-to-season
 *    distribution instead. That still normalizes across eras (the stated
 *    goal), just against OU's history rather than the whole sport's.
 * 2. SOS-adjusted margin (iterative SRS). Needs every opponent's own
 *    season game log, a second-order pull explicitly out of scope for the
 *    first data batch (see gap_report_verified_batch.md). No season in
 *    this dataset has it yet. When `sosAdjustedMargin` is null, its 30%
 *    of the Performance layer is redistributed proportionally across the
 *    other three sub-components rather than treated as zero — and the
 *    season is flagged, not silently scored as if SOS were average.
 * 3. Talent layer draft-pick components. No draft-record data source is
 *    wired into this pipeline. Every season's Talent layer is Heisman +
 *    All-American points only; the draft-pick sub-components are always
 *    absent and every season is flagged accordingly, not scored as zero
 *    draft picks (zero would claim knowledge this project doesn't have).
 *
 * Every one of these is surfaced per-season in `PowerIndexResult.gaps`,
 * per the brief's "a visible gap indicator... incompleteness is never
 * silently hidden" requirement — never absorbed quietly into the number.
 */
import type { PowerIndexResult, SeasonRecord } from "./types";

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

/** z-score of each value against the population's own mean/std-dev. NaN (missing input) passes through as null. */
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

interface PerformanceSubScores {
  pointDiffZ: (number | null)[];
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
 * Offensive/defensive efficiency, tiered by whatever this season's
 * data_tier actually has available — never invented for a season whose
 * tier doesn't support it. Tier 1 uses CFBD PPA; tiers 2-4 don't have a
 * reliable per-play or per-game yardage figure wired in yet (Wikipedia
 * infoboxes don't carry it), so they fall back to points-per-game/against
 * as the only efficiency proxy this pipeline can source without
 * fabricating a number.
 */
function offenseEfficiencyRaw(season: SeasonRecord): number | null {
  if (season.dataTier === 1 && season.offensePpa !== null) return season.offensePpa;
  const games = gamesPlayed(season);
  if (season.pointsFor === null || !games) return null;
  return season.pointsFor / games;
}

function defenseEfficiencyRaw(season: SeasonRecord): number | null {
  // Lower is better on both CFBD defensive PPA and points allowed, so both
  // get negated before z-scoring — "better defense" should z-score positive.
  if (season.dataTier === 1 && season.defensePpa !== null) return -season.defensePpa;
  const games = gamesPlayed(season);
  if (season.pointsAgainst === null || !games) return null;
  return -(season.pointsAgainst / games);
}

function computePerformanceSubScores(seasons: SeasonRecord[]): PerformanceSubScores {
  const pointDiffs = seasons.map(pointDifferentialPerGame);
  const sos = seasons.map((s) => s.sosAdjustedMargin ?? null);
  const offEff = seasons.map(offenseEfficiencyRaw);
  const defEff = seasons.map(defenseEfficiencyRaw);
  return {
    pointDiffZ: zScores(pointDiffs),
    sosZ: zScores(sos),
    offEffZ: zScores(offEff),
    defEffZ: zScores(defEff),
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
// Layer 2 — Accomplishment (35% of composite, capped at 100)
// ---------------------------------------------------------------------------

/**
 * Text-derived accomplishment flags. The verified/pulled dataset doesn't
 * carry clean booleans for "conference champion" or "bowl result" yet —
 * those live embedded in free-text fields (conference, national_title_claim,
 * source_notes). These heuristics are conservative on purpose: an
 * ambiguous case scores as *not* earned rather than guessed as earned, and
 * gets flagged so a human can confirm it during the manual-review pass.
 */
function deriveAccomplishments(season: SeasonRecord): {
  points: number;
  flags: string[];
} {
  let points = 0;
  const flags: string[] = [];
  const haystack = `${season.conference ?? ""} ${season.nationalTitleClaim ?? ""} ${season.sourceNotes}`.toLowerCase();

  if (season.nationalTitleClaim && /consensus/.test(season.nationalTitleClaim.toLowerCase())) {
    points += 40;
  } else if (season.nationalTitleClaim) {
    points += 25; // split/disputed claim
    flags.push("national title claim present but not marked consensus — scored as split/disputed (25 pts)");
  }

  const mentionsConferenceChamp = /champion|co-champ/.test(haystack) && !/national/.test(haystack.match(/champion|co-champ/)?.[0] ?? "");
  if (mentionsConferenceChamp) {
    points += 20;
  } else {
    const losses = gamesLost(season.finalRecord);
    if (losses !== null && losses <= 1) {
      // A near-perfect record with no championship language found is the
      // one genuinely ambiguous case — worth a human glance, not a blanket
      // flag on every season that simply wasn't a conference champion.
      flags.push("near-perfect record but no conference-championship language found in free text — verify manually rather than trust the absence");
    }
  }

  const apRank = parseApRank(season.finalApRank);
  if (apRank !== null) {
    if (apRank <= 5) points += 15;
    else if (apRank <= 10) points += 10;
    else if (apRank <= 25) points += 5;
  }

  if (/major bowl|orange bowl|sugar bowl|rose bowl|cotton bowl|cfp|bcs championship/.test(haystack)) {
    if (/loss|lost/.test(haystack)) {
      points += 3;
    } else {
      points += 15;
    }
  } else if (/bowl/.test(haystack)) {
    points += /loss|lost/.test(haystack) ? 3 : 8;
  }

  return { points: Math.min(points, 100), flags };
}

function gamesLost(record: string | null): number | null {
  if (!record) return null;
  const match = record.match(/^\d+-(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseApRank(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
}

// ---------------------------------------------------------------------------
// Layer 3 — Talent (15% of composite, normalized against OU's best season)
// ---------------------------------------------------------------------------

function talentPointsRaw(season: SeasonRecord): { points: number; flags: string[] } {
  let points = 0;
  const flags: string[] = [];
  if (season.heismanWinner) points += 30;

  if (season.notableAllAmericans) {
    const names = season.notableAllAmericans
      .split(/[;,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    points += Math.min(names.length * 8, 40);
    flags.push(
      `${names.length} All-American mention(s) counted from free text — the source doesn't distinguish consensus All-Americans from other honors, so this is approximate`,
    );
  }

  flags.push("draft-pick components (1st/2nd round +6, 3rd-7th +2) not scored — no draft-record data source wired into this pipeline yet");
  return { points, flags };
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

  const perf = computePerformanceSubScores(seasons);
  const rawPerformance = seasons.map((_, i) =>
    combinePerformance({
      pointDiff: perf.pointDiffZ[i],
      sos: perf.sosZ[i],
      offEff: perf.offEffZ[i],
      defEff: perf.defEffZ[i],
    }),
  );
  const performanceLayer = zScoresTo0to100(rawPerformance);

  const accomplishments = seasons.map(deriveAccomplishments);
  const talentRaw = seasons.map(talentPointsRaw);
  const maxTalent = Math.max(...talentRaw.map((t) => t.points), 1);

  const results = seasons.map((season, i) => {
    const gaps: string[] = [];

    if (perf.pointDiffZ[i] === null) gaps.push("point differential not computable (missing points_for/points_against or final record)");
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
      pointDiffZ: perf.pointDiffZ[i],
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
