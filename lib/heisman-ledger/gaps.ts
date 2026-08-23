import "server-only";
import worklistJson from "@/data/heisman-ledger/manual_review_worklist.json";
import { getSeasons } from "./data";

export interface ManualReviewItem {
  year: number;
  issue: string;
  needed: string;
  status: "flagged" | "not_started";
}

const FIRST_SEASON = 1895;
/**
 * The most recent *completed* season, not the calendar year — a college
 * football season starts in late August, so for most of the year the
 * current calendar year's season either hasn't been played yet or is still
 * in progress. Bump this once a year, after the season actually ends.
 */
const LAST_COMPLETED_SEASON = 2025;

/**
 * Matt's actual worklist (Cowork brief, Step 5) — every hand-flagged item
 * from the verified batch's gap report, plus the systemic items that
 * aren't season-specific, plus (computed live) whichever seasons the
 * Wikipedia bulk pull hasn't covered yet. Never buried in the raw
 * dataset — this is what /analytics/heisman-park-ledger/gaps renders.
 */
export async function getManualReviewWorklist(): Promise<{
  flagged: ManualReviewItem[];
  notPulled: number[];
  sosNotStarted: boolean;
}> {
  const seasons = await getSeasons();
  const coveredYears = new Set(seasons.map((s) => s.year));
  const notPulled: number[] = [];
  for (let year = FIRST_SEASON; year <= LAST_COMPLETED_SEASON; year++) {
    if (!coveredYears.has(year)) notPulled.push(year);
  }

  return {
    flagged: worklistJson as ManualReviewItem[],
    notPulled,
    // True until every season in the dataset carries a game-level opponent
    // list from data/heisman-ledger/master/master_games.csv — see
    // power-index.ts's sosAdjustedMargin gap message for the per-season view.
    sosNotStarted: true,
  };
}
