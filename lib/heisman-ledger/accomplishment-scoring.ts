/**
 * Layer 2 — Accomplishment (35% of the Power Index composite, capped at
 * 100). Point table per CLAUDE.md: national title, conference title,
 * final AP rank, bowl result.
 *
 * Conference championship and bowl result read real structured fields
 * (SeasonRecord.conferenceChampion / bowlName / bowlResult) populated
 * directly by scripts/heisman_ledger/pull_wikipedia.py's infobox
 * extraction — not, as an earlier version of this file did, pattern-
 * matched out of free text at scoring time. That approach had real bugs:
 * a bowl loss recorded as "L 19–55" (not the literal word "loss") scored
 * as a win on 19 seasons in the live dataset, and a title claim that
 * explicitly said "not a national title year" still scored national-title
 * points because the field was merely non-empty. Reading a field the pull
 * already classified, rather than re-deriving the classification from
 * prose on every render, removes that whole bug class. National title
 * claim is the one exception still read as free text (nationalTitleClaim)
 * — that field's own wording (does it say "consensus"?) *is* the real
 * signal there, not a proxy for one.
 */
import type { SeasonRecord } from "./types";

export const ACCOMPLISHMENT_POINTS = {
  nationalTitle: { consensus: 40, splitOrDisputed: 25 },
  conferenceChampion: 20,
  finalApRank: { top5: 15, top10: 10, top25: 5 },
  bowlResult: { majorWin: 15, majorLoss: 3, otherWin: 8, otherLoss: 3 },
} as const;

/**
 * Applied only to the (now narrow, structured) bowlName field — not a
 * whole-season haystack of concatenated prose the way the old bowl-result
 * check was, which risked a false match from unrelated text elsewhere in
 * source_notes.
 */
const MAJOR_BOWL_RE = /orange bowl|sugar bowl|rose bowl|cotton bowl|cfp|bcs (championship|national championship)/i;

export interface AccomplishmentScore {
  points: number;
  flags: string[];
}

export function computeAccomplishmentScore(season: SeasonRecord): AccomplishmentScore {
  let points = 0;
  const flags: string[] = [];

  const titleClaim = season.nationalTitleClaim?.toLowerCase() ?? null;
  if (titleClaim && /not a national title/.test(titleClaim)) {
    // The claim text itself disclaims a national title (e.g. "Orange Bowl
    // Champion (not a national title year)") -- confirmed against 1986,
    // which was being scored as a real, if disputed, national-title claim
    // purely because the field was non-empty. Any bowl-win credit for that
    // season is still picked up by the bowl-result check below.
  } else if (titleClaim && (/consensus/.test(titleClaim) || /bcs national champion/.test(titleClaim))) {
    // "BCS National Champion" is treated as the modern equivalent of
    // "consensus" (1998-2013): the BCS system existed specifically to
    // produce one human-and-computer-poll-combined #1, and confirmed
    // against 2000 specifically -- undisputed, unanimous #1 that year --
    // this was scoring as split/disputed (25pts) purely because the
    // stored text says "BCS National Champion" rather than the literal
    // word "consensus".
    points += ACCOMPLISHMENT_POINTS.nationalTitle.consensus;
  } else if (season.nationalTitleClaim) {
    points += ACCOMPLISHMENT_POINTS.nationalTitle.splitOrDisputed;
    flags.push("national title claim present but not marked consensus — scored as split/disputed (25 pts)");
  }

  if (season.conferenceChampion === "TRUE" || season.conferenceChampion === "CO-CHAMP") {
    points += ACCOMPLISHMENT_POINTS.conferenceChampion;
  } else if (season.conferenceChampion === null) {
    // Only a genuinely unknown case flags here now — pull_wikipedia.py
    // sets "FALSE" (not null) whenever it found a real infobox that
    // simply didn't claim a conference title, which is a confirmed
    // negative, not an absence of evidence; null only happens when no
    // infobox was found for the season at all.
    flags.push("conference championship status unknown — no infobox found for this season to confirm either way");
  }

  const apRank = parseApRank(season.finalApRank);
  if (apRank !== null) {
    if (apRank <= 5) points += ACCOMPLISHMENT_POINTS.finalApRank.top5;
    else if (apRank <= 10) points += ACCOMPLISHMENT_POINTS.finalApRank.top10;
    else if (apRank <= 25) points += ACCOMPLISHMENT_POINTS.finalApRank.top25;
  }

  if (season.bowlResult !== null) {
    // A tie is rare (pre-modern-era bowls only) and scores on the loss
    // tier — the point table has no separate tie tier, and "not a win" is
    // the more honest reading of a tie than "not a loss."
    const isWin = season.bowlResult === "W";
    const isMajor = season.bowlName !== null && MAJOR_BOWL_RE.test(season.bowlName);
    points += isMajor
      ? isWin
        ? ACCOMPLISHMENT_POINTS.bowlResult.majorWin
        : ACCOMPLISHMENT_POINTS.bowlResult.majorLoss
      : isWin
        ? ACCOMPLISHMENT_POINTS.bowlResult.otherWin
        : ACCOMPLISHMENT_POINTS.bowlResult.otherLoss;
  }
  // bowlResult === null means no bowl game that season -- a real, common
  // outcome, not a gap, so nothing is flagged.

  return { points: Math.min(points, 100), flags };
}

function parseApRank(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
}
