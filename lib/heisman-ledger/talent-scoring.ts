/**
 * Layer 3 — Talent (15% of the Power Index composite, normalized against
 * the best Talent score in the current dataset). Point table per
 * CLAUDE.md: Heisman winner/finalists, All-Americans, draft picks by
 * round.
 *
 * Two sub-components the brief calls for aren't scored here yet, because
 * no source wired into this pipeline supplies them:
 *  - Heisman finalists — the schema only captures the winner today
 *    (`heismanWinner`); adding finalists means a schema change plus new
 *    Wikipedia-pull extraction, not attempted in this pass.
 *  - Draft picks by round — no draft-record data source in this pipeline
 *    (Wikipedia/CFBD/NCAA don't carry it).
 * Both are surfaced as a standing gap on every season rather than
 * silently scored as zero, which would claim knowledge this project
 * doesn't have.
 */
import type { SeasonRecord } from "./types";

export const TALENT_POINTS = {
  heismanWinner: 30,
  perAllAmerican: 8,
  allAmericanCap: 40,
  // Not scored yet (see module doc comment) — kept here as the target
  // table so the point values are decided once, in one place, rather than
  // invented again whenever a draft-record source finally gets wired in.
  draftRound1or2: 6,
  draftRound3to7: 2,
} as const;

export interface TalentScore {
  points: number;
  flags: string[];
}

export function computeTalentScore(season: SeasonRecord): TalentScore {
  let points = 0;
  const flags: string[] = [];
  if (season.heismanWinner) points += TALENT_POINTS.heismanWinner;

  if (season.notableAllAmericans) {
    const names = season.notableAllAmericans
      .split(/[;,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    points += Math.min(names.length * TALENT_POINTS.perAllAmerican, TALENT_POINTS.allAmericanCap);
    flags.push(
      `${names.length} All-American mention(s) counted from free text — the source doesn't distinguish consensus All-Americans from other honors, so this is approximate`,
    );
  }

  flags.push("Heisman finalists not scored — only the winner is captured in the current schema");
  flags.push(
    `draft-pick components (1st/2nd round +${TALENT_POINTS.draftRound1or2}, 3rd-7th round +${TALENT_POINTS.draftRound3to7}) not scored — no draft-record data source wired into this pipeline yet`,
  );
  return { points, flags };
}
