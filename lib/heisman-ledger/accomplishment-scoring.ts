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
 *
 * Bowl result is scored by STAGE, not a flat major/other split — both win
 * and loss are graded by how big the game was, symmetrically (a Fiesta
 * Bowl win outscores a Cheez-It Bowl win; a national title game loss
 * outscores an Independence Bowl loss). The earlier flat version gave
 * every loss the same 3 points regardless of stakes — OU's own bowl
 * history has 4 national-title-game appearances (2000 win, 2003/2004/2008
 * losses) and 4 CFP-semifinal appearances (2015/2017/2018/2019, all
 * losses), every one of those 7 losses scoring identically to losing the
 * Independence Bowl. classifyBowlTier() below fixes that. This can stack
 * additively with the national-title-claim credit above (a title-game win
 * earns both) rather than needing special-cased to avoid double-counting
 * — the whole layer is hard-capped at 100 either way (see the return
 * statement), so a title-winning season just hits that cap, same as
 * before.
 */
import type { SeasonRecord } from "./types";

export const ACCOMPLISHMENT_POINTS = {
  nationalTitle: { consensus: 40, splitOrDisputed: 25 },
  conferenceChampion: 20,
  finalApRank: { top5: 15, top10: 10, top25: 5 },
  bowlResult: {
    titleGame: { win: 40, loss: 18 },
    cfpSemifinal: { win: 25, loss: 10 },
    newYearsSix: { win: 15, loss: 5 },
    other: { win: 8, loss: 2 },
  },
} as const;

type BowlTier = "titleGame" | "cfpSemifinal" | "newYearsSix" | "other";

/**
 * Classifies bowlName by stage, checked most-specific-first since a name
 * can match more than one pattern (e.g. "Orange Bowl (BCS NCG)" contains
 * both "orange bowl" and "ncg" — the title-game signal must win). Applied
 * only to the narrow, structured bowlName field, not a whole-season
 * haystack of prose.
 *
 *  - titleGame: the literal national championship game. Confirmed against
 *    live bowlName values across eras: "BCS National Championship Game"
 *    (2008), "Orange Bowl (BCS NCG)" (2000/2004), "Sugar Bowl (BCS NCG)"
 *    (2003) — "NCG" as its own token is the real abbreviation Wikipedia
 *    uses for these, not spelled out every time.
 *  - cfpSemifinal: any bowl hosting a CFP semifinal that season (the venue
 *    rotates among the NY6 bowls) — confirmed on "Orange Bowl (CFP
 *    Semifinal)" (2015/2018), "Rose Bowl (CFP Semifinal)" (2017), "Peach
 *    Bowl (CFP semifinal)" (2019, lowercase "s" — matched case-
 *    insensitively so casing drift doesn't silently miss it).
 *  - newYearsSix: Rose, Sugar, Orange, Cotton, Fiesta, Peach in their
 *    normal (non-playoff-hosting) role. Fiesta and Peach were missing
 *    from this project's original major-bowl list entirely — confirmed
 *    live: 1976's and 2010's real Fiesta Bowl wins were scoring as
 *    "other" (8 pts) instead of NY6 (15) before this fix.
 *  - other: everything else, including the new (2024 playoff expansion)
 *    "CFP First Round" bowlName — a real, lower-stakes playoff game, not
 *    yet common enough in OU's own history to warrant its own tier.
 */
function classifyBowlTier(bowlName: string): BowlTier {
  const lowered = bowlName.toLowerCase();
  if (/national championship|\bncg\b/.test(lowered)) return "titleGame";
  if (/cfp semifinal/.test(lowered)) return "cfpSemifinal";
  if (/orange bowl|sugar bowl|rose bowl|cotton bowl|fiesta bowl|peach bowl/.test(lowered)) return "newYearsSix";
  return "other";
}

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
    // side of its tier — the point table has no separate tie tier, and
    // "not a win" is the more honest reading of a tie than "not a loss."
    const isWin = season.bowlResult === "W";
    const tier = season.bowlName !== null ? classifyBowlTier(season.bowlName) : "other";
    points += isWin ? ACCOMPLISHMENT_POINTS.bowlResult[tier].win : ACCOMPLISHMENT_POINTS.bowlResult[tier].loss;
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
