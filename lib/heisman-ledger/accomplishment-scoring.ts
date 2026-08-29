/**
 * Layer 2 — Accomplishment (35% of the Power Index composite, capped at
 * 100). Point table per CLAUDE.md: national title, conference title,
 * final AP rank, bowl result.
 *
 * The verified/pulled dataset doesn't carry clean booleans for "conference
 * champion" or "bowl result" — those live embedded in free-text fields
 * (conference, national_title_claim, source_notes). These heuristics are
 * conservative on purpose: an ambiguous case scores as *not* earned rather
 * than guessed as earned, and gets flagged so a human can confirm it
 * during the manual-review pass. A future data-schema change (explicit
 * conference_champion / bowl_result columns, populated by the pull
 * scripts) would let this file read real fields instead of pattern-
 * matching prose — noted here, not attempted in this pass, since it's a
 * data-collection change, not a scoring-formula one.
 */
import type { SeasonRecord } from "./types";

export const ACCOMPLISHMENT_POINTS = {
  nationalTitle: { consensus: 40, splitOrDisputed: 25 },
  conferenceChampion: 20,
  finalApRank: { top5: 15, top10: 10, top25: 5 },
  bowlResult: { majorWin: 15, majorLoss: 3, otherWin: 8, otherLoss: 3 },
} as const;

export interface AccomplishmentScore {
  points: number;
  flags: string[];
}

export function computeAccomplishmentScore(season: SeasonRecord): AccomplishmentScore {
  let points = 0;
  const flags: string[] = [];
  const haystack = `${season.conference ?? ""} ${season.nationalTitleClaim ?? ""} ${season.sourceNotes}`.toLowerCase();

  if (season.nationalTitleClaim && /consensus/.test(season.nationalTitleClaim.toLowerCase())) {
    points += ACCOMPLISHMENT_POINTS.nationalTitle.consensus;
  } else if (season.nationalTitleClaim) {
    points += ACCOMPLISHMENT_POINTS.nationalTitle.splitOrDisputed;
    flags.push("national title claim present but not marked consensus — scored as split/disputed (25 pts)");
  }

  const mentionsConferenceChamp =
    /champion|co-champ/.test(haystack) && !/national/.test(haystack.match(/champion|co-champ/)?.[0] ?? "");
  if (mentionsConferenceChamp) {
    points += ACCOMPLISHMENT_POINTS.conferenceChampion;
  } else {
    const losses = gamesLost(season.finalRecord);
    if (losses !== null && losses <= 1) {
      // A near-perfect record with no championship language found is the
      // one genuinely ambiguous case — worth a human glance, not a
      // blanket flag on every season that simply wasn't a conference
      // champion.
      flags.push(
        "near-perfect record but no conference-championship language found in free text — verify manually rather than trust the absence",
      );
    }
  }

  const apRank = parseApRank(season.finalApRank);
  if (apRank !== null) {
    if (apRank <= 5) points += ACCOMPLISHMENT_POINTS.finalApRank.top5;
    else if (apRank <= 10) points += ACCOMPLISHMENT_POINTS.finalApRank.top10;
    else if (apRank <= 25) points += ACCOMPLISHMENT_POINTS.finalApRank.top25;
  }

  if (/major bowl|orange bowl|sugar bowl|rose bowl|cotton bowl|cfp|bcs championship/.test(haystack)) {
    points += /loss|lost/.test(haystack)
      ? ACCOMPLISHMENT_POINTS.bowlResult.majorLoss
      : ACCOMPLISHMENT_POINTS.bowlResult.majorWin;
  } else if (/bowl/.test(haystack)) {
    points += /loss|lost/.test(haystack)
      ? ACCOMPLISHMENT_POINTS.bowlResult.otherLoss
      : ACCOMPLISHMENT_POINTS.bowlResult.otherWin;
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
