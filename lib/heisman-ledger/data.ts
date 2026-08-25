import "server-only";
import seasonsJson from "@/data/heisman-ledger/master/master_seasons.json";
import type { SeasonRecord } from "./types";
import { getSupabaseClient } from "./supabase";

/**
 * Data-access layer for the Ledger. Every caller in app/ goes through
 * getSeasons(), never the JSON import or a Supabase client directly, so
 * the storage backend is one place to change.
 *
 * Reads Supabase automatically once SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set (in Vercel, or a local
 * .env.local — see supabase/heisman-ledger/schema.sql and seed.sql).
 * Until then, falls back to the committed static JSON (produced by
 * scripts/heisman_ledger/csv_to_json.py from the merged CSV) — per
 * CLAUDE.md's pattern that static/historical data can live as committed
 * JSON rather than round-tripping through a database. A Supabase read
 * error also falls back to the static file rather than failing the page,
 * since a stale-but-correct dataset beats a broken one.
 */
export async function getSeasons(): Promise<SeasonRecord[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("heisman_ledger_seasons")
      .select("*")
      .order("year", { ascending: true });
    if (!error && data) {
      return data.map(fromSupabaseRow);
    }
    console.error("Supabase read failed for heisman_ledger_seasons, falling back to static JSON:", error);
  }
  return (seasonsJson as RawSeasonJson[]).map(fromJson);
}

function fromSupabaseRow(row: Record<string, unknown>): SeasonRecord {
  return fromJson(row as unknown as RawSeasonJson);
}

// Shape as it sits on disk (snake_case, matching the Python pipeline's CSV headers).
interface RawSeasonJson {
  year: number;
  head_coach: string | null;
  conference: string | null;
  final_record: string | null;
  final_ap_rank: string | null;
  national_title_claim: string | null;
  points_for: number | null;
  points_for_is_approximate: boolean;
  points_against: number | null;
  points_against_is_approximate: boolean;
  beat_texas: SeasonRecord["beatTexas"];
  beat_osu: SeasonRecord["beatOsu"];
  heisman_winner: string | null;
  notable_all_americans: string | null;
  data_tier: 1 | 2 | 3 | 4;
  source_notes: string;
  offense_ppa: number | null;
  defense_ppa: number | null;
  offense_success_rate: number | null;
  defense_success_rate: number | null;
  sp_overall: number | null;
  sp_offense: number | null;
  sp_defense: number | null;
  /** Absent from the committed JSON until the next CFBD pull regenerates it — see fromJson's ?? null. */
  offense_total_yards?: number | null;
  offense_rushing_yards?: number | null;
  offense_passing_yards?: number | null;
  offense_turnovers?: number | null;
  /** Only present on a Supabase row today (see schema.sql) — absent from the static JSON until the SOS pull exists. */
  sos_adjusted_margin?: number | null;
}

function fromJson(row: RawSeasonJson): SeasonRecord {
  return {
    year: row.year,
    headCoach: row.head_coach,
    conference: row.conference,
    finalRecord: row.final_record,
    finalApRank: row.final_ap_rank,
    nationalTitleClaim: row.national_title_claim,
    pointsFor: row.points_for,
    pointsForIsApproximate: row.points_for_is_approximate,
    pointsAgainst: row.points_against,
    pointsAgainstIsApproximate: row.points_against_is_approximate,
    beatTexas: row.beat_texas,
    beatOsu: row.beat_osu,
    heismanWinner: row.heisman_winner,
    notableAllAmericans: row.notable_all_americans,
    dataTier: row.data_tier,
    sourceNotes: row.source_notes ?? "",
    offensePpa: row.offense_ppa,
    defensePpa: row.defense_ppa,
    offenseSuccessRate: row.offense_success_rate,
    defenseSuccessRate: row.defense_success_rate,
    spOverall: row.sp_overall,
    spOffense: row.sp_offense,
    spDefense: row.sp_defense,
    // ?? null, not a plain pass-through: the committed JSON predates these
    // columns until the next CFBD pull regenerates it, so the key is
    // simply absent (undefined) on every row today, not present-and-null.
    offenseTotalYards: row.offense_total_yards ?? null,
    offenseRushingYards: row.offense_rushing_yards ?? null,
    offensePassingYards: row.offense_passing_yards ?? null,
    offenseTurnovers: row.offense_turnovers ?? null,
    sosAdjustedMargin: row.sos_adjusted_margin ?? null,
  };
}
