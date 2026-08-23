/**
 * Row shape for one OU football season, matching the merged CSV/JSON the
 * Python pipeline in scripts/heisman_ledger/ produces
 * (data/heisman-ledger/master/master_seasons.json today; a Supabase table
 * once that's wired — see lib/heisman-ledger/data.ts).
 */
export type TriBool = "TRUE" | "FALSE" | "SPLIT" | "N/A (not on schedule)" | null;

export interface SeasonRecord {
  year: number;
  headCoach: string | null;
  conference: string | null;
  finalRecord: string | null;
  finalApRank: string | null;
  nationalTitleClaim: string | null;
  pointsFor: number | null;
  pointsForIsApproximate: boolean;
  pointsAgainst: number | null;
  pointsAgainstIsApproximate: boolean;
  beatTexas: TriBool;
  beatOsu: TriBool;
  heismanWinner: string | null;
  notableAllAmericans: string | null;
  /** 1 = 2005+ CFBD efficiency, 2 = yards/play, 3 = yards/game vs. rank proxy, 4 = points/game only. */
  dataTier: 1 | 2 | 3 | 4;
  sourceNotes: string;
  offensePpa: number | null;
  defensePpa: number | null;
  offenseSuccessRate: number | null;
  defenseSuccessRate: number | null;
  spOverall: number | null;
  spOffense: number | null;
  spDefense: number | null;
  /**
   * Iterative-SRS opponent-adjusted point margin. Not populated by anything
   * in this codebase yet — computing it needs each opponent's own
   * season-long game log (a second-order pull explicitly out of scope for
   * the first data batch; see gap_report_verified_batch.md). Left
   * undefined/null on every season today; power-index.ts degrades
   * gracefully and flags it rather than substituting a guess.
   */
  sosAdjustedMargin?: number | null;
}

export interface PowerIndexResult {
  year: number;
  powerIndex: number; // 0-100
  performanceLayer: number; // 0-100
  accomplishmentLayer: number; // 0-100, capped
  talentLayer: number; // 0-100
  pointDifferentialPerGame: number | null;
  rank: number; // 1 = best, after tiebreak
  /**
   * Every reason this season's score leans on a proxy or is missing an
   * input the brief's formula calls for. Never silently absorbed into the
   * score — the dashboard renders these as the season's gap indicator.
   */
  gaps: string[];
}
