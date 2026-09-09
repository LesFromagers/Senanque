/**
 * Layer 3 — Talent (15% of the Power Index composite, normalized against
 * the best Talent score in the current dataset). Point table per
 * CLAUDE.md: Heisman winner/finalists, All-Americans, draft picks by
 * round.
 *
 * All-Americans are scored from `consensusAllAmericans` /
 * `consensusAllAmericanCount` — NCAA-consensus selections pulled from each
 * season's own Wikipedia "College Football All-America Team" page
 * (scripts/heisman_ledger/pull_all_americans.py), not the older free-text
 * `notableAllAmericans` column, which was hand-entered prose with no
 * consensus filtering and was found to overcount relative to true
 * consensus status (1950's free-text list carries 4 names; only 2 are
 * real NCAA-consensus selections). `notableAllAmericans` is kept on the
 * type for display only — it is not read here.
 *
 * A null `consensusAllAmericanCount` means the season is genuinely
 * unresolved (no All-America team page found, or a page format the pull
 * doesn't recognize) — flagged below, not scored as zero. A season that
 * resolved with a real count of 0 is scored as 0, no flag, same as any
 * other confirmed-negative field elsewhere in this pipeline.
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

  if (season.consensusAllAmericanCount !== null) {
    const count = season.consensusAllAmericanCount;
    points += Math.min(count * TALENT_POINTS.perAllAmerican, TALENT_POINTS.allAmericanCap);
    if (count === 0) {
      flags.push("0 NCAA-consensus All-Americans that season (confirmed, not a gap)");
    }
  } else {
    flags.push(
      "consensus All-Americans not scored — the season's All-America team page wasn't found or didn't match a recognized format (see gap_report_all_americans.md)",
    );
  }

  flags.push("Heisman finalists not scored — only the winner is captured in the current schema");
  flags.push(
    `draft-pick components (1st/2nd round +${TALENT_POINTS.draftRound1or2}, 3rd-7th round +${TALENT_POINTS.draftRound3to7}) not scored — no draft-record data source wired into this pipeline yet`,
  );
  return { points, flags };
}
