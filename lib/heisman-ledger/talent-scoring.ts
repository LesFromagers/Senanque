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
 * Heisman finalists (`heismanFinalists`/`heismanFinalistCount`) are scored
 * additively and unconditionally alongside the winner — 10 points each,
 * capped at 20 total, whether or not the season also has a winner (winner
 * alone = 30, winner + 2 finalists = 50, two finalists with no winner =
 * 20). The cap is set well below a win's own 30 points on purpose:
 * finalist credit is real — it's genuine national recognition — but
 * deliberately kept subordinate to actually winning, not a path to
 * matching or exceeding it through volume. Sourced from a small hand-
 * supplied list (`data/heisman-ledger/heisman_finalists.csv`), not an
 * automated pull: direct investigation found no Wikipedia page (per-year
 * or OU's own season page) or NCAA archive carries finalist/voting data
 * across OU's history, and Sports-Reference is never automated per
 * CLAUDE.md. A year absent from that list is a confirmed zero, not a gap
 * — `heismanFinalistCount` is never null, unlike `consensusAllAmericanCount`.
 *
 * Draft picks (`draftPicksR1R2`/`draftPicksR3To7`) are scored from
 * scripts/heisman_ledger/pull_draft_picks.py, reading Wikipedia's "List of
 * Oklahoma Sooners in the NFL draft" and mapping each pick to
 * draft_year - 1 (the season that made the player draft-eligible — true
 * whether that was a normal senior year, an early-declare junior year, or
 * a one-season transfer-in, confirmed against several players' own bio-
 * page college-year infoboxes rather than assumed). Round 1-2 picks earn
 * `draftRound1or2` each, round 3-7 earn `draftRound3to7` each — uncapped,
 * unlike the All-American and finalist components: CLAUDE.md's Talent
 * point table doesn't specify a cap for this component, so none is
 * invented here. Every season has a real, confirmed pick count (never
 * null) — this pull reads one fully-parsed page, not a per-year source
 * that can leave a year unresolved.
 */
import type { SeasonRecord } from "./types";

export const TALENT_POINTS = {
  heismanWinner: 30,
  heismanFinalist: 10,
  heismanFinalistCap: 20,
  perAllAmerican: 8,
  allAmericanCap: 40,
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

  if (season.heismanFinalistCount > 0) {
    points += Math.min(season.heismanFinalistCount * TALENT_POINTS.heismanFinalist, TALENT_POINTS.heismanFinalistCap);
  }

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

  points += season.draftPicksR1R2 * TALENT_POINTS.draftRound1or2;
  points += season.draftPicksR3To7 * TALENT_POINTS.draftRound3to7;

  return { points, flags };
}
