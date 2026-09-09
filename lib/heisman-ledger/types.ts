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
  /** "TRUE" (outright) | "CO-CHAMP" (shared) | "FALSE" | null (genuinely unknown — no infobox found at all). */
  conferenceChampion: "TRUE" | "CO-CHAMP" | "FALSE" | null;
  /** e.g. "Orange Bowl", "CFP First Round" — null means no bowl game that season, not a gap. */
  bowlName: string | null;
  bowlResult: "W" | "L" | "T" | null;
  pointsFor: number | null;
  pointsForIsApproximate: boolean;
  pointsAgainst: number | null;
  pointsAgainstIsApproximate: boolean;
  beatTexas: TriBool;
  beatOsu: TriBool;
  heismanWinner: string | null;
  /**
   * Heisman finalists (or, pre-1982, a qualifying top vote finish) who
   * weren't that season's winner — "Name; Name", from a small hand-
   * supplied list (data/heisman-ledger/heisman_finalists.csv), not an
   * automated pull; no Wikipedia page or NCAA archive carries this data.
   * A year with none is a confirmed zero (empty string), never null —
   * there's no unresolved/gap state here, unlike consensusAllAmericans.
   */
  heismanFinalists: string;
  heismanFinalistCount: number;
  /** Free-text, hand-entered honors mention — not consensus-filtered. Kept for display; see consensusAllAmericans for the Talent layer's actual scoring input. */
  notableAllAmericans: string | null;
  /**
   * NFL draft picks mapped to this season (draft_year - 1) — from
   * pull_draft_picks.py reading Wikipedia's "List of Oklahoma Sooners in
   * the NFL draft". Round-1/2 and round-3-7 counts are the Talent layer's
   * scoring inputs; draftPicksDetail ("Name (R1); Name (R3)") is display
   * only. Every season is populated — a real, confirmed zero, never null.
   */
  draftPicksR1R2: number;
  draftPicksR3To7: number;
  draftPicksDetail: string;
  /**
   * NCAA-consensus Oklahoma All-Americans, "Name (Position); Name (Position)"
   * — from pull_all_americans.py reading each season's own Wikipedia
   * "College Football All-America Team" page. null means unresolved (no
   * page found, or an unrecognized page format); "" is a real, checked
   * zero for that season, not a gap. See talent-scoring.ts.
   */
  consensusAllAmericans: string | null;
  consensusAllAmericanCount: number | null;
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
   * Raw season counting stats from CFBD's api/stats/season (2005+ only) —
   * OU's own offensive output, supplementary context alongside the
   * era-adjusted offensePpa/defensePpa above. There's no matching "yards
   * allowed" figure: CFBD's season-stats endpoint doesn't split by
   * offense/defense, so a real defensive-yardage number isn't available
   * without reconciling every opponent's own season stats game-by-game —
   * left undone rather than approximated. defensePpa remains the actual
   * defensive-quality figure the Power Index uses.
   */
  offenseTotalYards: number | null;
  offenseRushingYards: number | null;
  offensePassingYards: number | null;
  offenseTurnovers: number | null;
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
