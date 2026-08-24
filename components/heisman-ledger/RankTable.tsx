"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PowerIndexResult, SeasonRecord } from "@/lib/heisman-ledger/types";
import { BeatMarks } from "./BeatMarks";
import { GapBadge } from "./GapBadge";
import { HeismanTrophyIcon } from "./HeismanTrophyIcon";
import { WaxSealIcon } from "./WaxSealIcon";

export interface LedgerRow {
  result: PowerIndexResult;
  season: SeasonRecord;
}

type SortKey = "rank" | "year" | "record" | "powerIndex" | "pointDiff" | "offense" | "defense";

const SORT_LABELS: Record<SortKey, string> = {
  rank: "Rank",
  year: "Year",
  record: "Record",
  powerIndex: "Index",
  pointDiff: "Pt Diff/G",
  offense: "Off. Eff.",
  defense: "Def. Eff.",
};

// Special View-dropdown values that set a sort rather than filter rows by
// coach — kept distinct from a real coach name so the two concerns (which
// rows show, how they're ordered) don't collide in one select's value.
const VIEW_OFFENSE = "__offense_ranking__";
const VIEW_DEFENSE = "__defense_ranking__";

function winsFromRecord(record: string | null): number {
  if (!record) return -1;
  const match = record.match(/^(\d+)/);
  return match ? Number(match[1]) : -1;
}

export function RankTable({ rows }: { rows: LedgerRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const coaches = useMemo(() => {
    const set = new Set(rows.map((r) => r.season.headCoach).filter((c): c is string => Boolean(c)));
    return Array.from(set).sort();
  }, [rows]);

  const isCoachFilter = coachFilter !== "all" && coachFilter !== VIEW_OFFENSE && coachFilter !== VIEW_DEFENSE;

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (isCoachFilter && r.season.headCoach !== coachFilter) return false;
      if (query && !String(r.season.year).includes(query) && !r.season.headCoach?.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rows, coachFilter, isCoachFilter, query]);

  const sorted = useMemo(() => {
    const withKey = [...filtered];
    withKey.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "rank":
          diff = a.result.rank - b.result.rank;
          break;
        case "year":
          diff = a.season.year - b.season.year;
          break;
        case "record":
          diff = winsFromRecord(a.season.finalRecord) - winsFromRecord(b.season.finalRecord);
          break;
        case "powerIndex":
          diff = a.result.powerIndex - b.result.powerIndex;
          break;
        case "pointDiff":
          diff = (a.result.pointDifferentialPerGame ?? -999) - (b.result.pointDifferentialPerGame ?? -999);
          break;
        case "offense":
          diff = (a.season.offensePpa ?? a.season.pointsFor ?? -999) - (b.season.offensePpa ?? b.season.pointsFor ?? -999);
          break;
        case "defense": {
          // Lower PPA/points-allowed is *better* defense, so quality is the
          // negation of the raw stat — this way "descending" reads as
          // best-defense-first, the way a fan expects a ranking to read,
          // not just "biggest raw number first".
          const qa = a.season.defensePpa !== null ? -a.season.defensePpa : a.season.pointsAgainst !== null ? -a.season.pointsAgainst : -Infinity;
          const qb = b.season.defensePpa !== null ? -b.season.defensePpa : b.season.pointsAgainst !== null ? -b.season.pointsAgainst : -Infinity;
          diff = qa - qb;
          break;
        }
      }
      return sortAsc ? diff : -diff;
    });
    return withKey;
  }, [filtered, sortKey, sortAsc]);

  // The wax seal marks whatever's #1 by Power Index within the *currently
  // filtered* context — "highest ranking team in each filtered context",
  // per the brief, not just the global all-time #1.
  const topInContext = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((best, r) => (r.result.powerIndex > best.result.powerIndex ? r : best));
  }, [filtered]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(key === "rank" || key === "year");
    }
  }

  const contextLabel =
    coachFilter === VIEW_OFFENSE
      ? "Top Offense"
      : coachFilter === VIEW_DEFENSE
        ? "Top Defense"
        : coachFilter === "all"
          ? "All-Time"
          : coachFilter;

  function handleViewChange(value: string) {
    setCoachFilter(value);
    if (value === VIEW_OFFENSE) {
      setSortKey("offense");
      setSortAsc(false);
    } else if (value === VIEW_DEFENSE) {
      setSortKey("defense");
      setSortAsc(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-charcoal/80">
          View
          <select
            value={coachFilter}
            onChange={(e) => handleViewChange(e.target.value)}
            className="rounded-sm border border-stone/50 bg-oat px-2 py-1 text-sm text-charcoal"
          >
            <option value="all">Overall</option>
            <option value={VIEW_OFFENSE}>Offensive Ranking (desc.)</option>
            <option value={VIEW_DEFENSE}>Defensive Ranking (desc.)</option>
            {coaches.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <input
          type="text"
          placeholder="Search year or coach…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-sm border border-stone/50 bg-oat px-2 py-1 text-sm text-charcoal placeholder:text-stone"
        />
        <span className="text-xs text-stone">
          Showing {sorted.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal/20 text-left text-xs tracking-label uppercase text-stone">
              {(
                [
                  ["rank", "Rank"],
                  ["year", "Year"],
                  ["coach", "Head Coach"],
                  ["record", "Record"],
                  ["powerIndex", "Index"],
                  ["pointDiff", "Pt Diff/G"],
                  ["offense", "Off. Eff."],
                  ["defense", "Def. Eff."],
                  ["marks", "Marks"],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="whitespace-nowrap px-3 py-2">
                  {key in SORT_LABELS ? (
                    <button
                      onClick={() => toggleSort(key as SortKey)}
                      className="hover:text-plum"
                    >
                      {label}
                      {sortKey === key ? (sortAsc ? " ▲" : " ▼") : ""}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {sorted.map(({ result, season }) => {
              const isTop = topInContext?.season.year === season.year;
              return (
                <tr
                  key={season.year}
                  className={`border-b border-stone/20 ${isTop ? "bg-lavender/20" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-3 align-middle">
                    <span className="inline-flex items-center gap-2">
                      {isTop && (
                        <span className="inline-block h-8 w-8 shrink-0">
                          <WaxSealIcon contextLabel={contextLabel} />
                        </span>
                      )}
                      {result.rank}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link
                      href={`/analytics/heisman-park-ledger/${season.year}`}
                      className="font-sans font-medium text-charcoal hover:text-plum hover:underline"
                    >
                      {season.year}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-sans text-charcoal">
                    {season.headCoach ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{season.finalRecord ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-charcoal">
                    <span className="inline-flex items-center gap-1.5">
                      {result.powerIndex.toFixed(1)}
                      {season.heismanWinner && (
                        <span title={`Heisman winner: ${season.heismanWinner}`} className="text-gold">
                          <HeismanTrophyIcon className="h-4 w-4" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {result.pointDifferentialPerGame !== null ? result.pointDifferentialPerGame.toFixed(1) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {season.offensePpa !== null ? season.offensePpa.toFixed(2) : season.pointsFor !== null ? `${season.pointsFor} PF` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {season.defensePpa !== null ? season.defensePpa.toFixed(2) : season.pointsAgainst !== null ? `${season.pointsAgainst} PA` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-2 font-sans">
                      <BeatMarks beatTexas={season.beatTexas} beatOsu={season.beatOsu} />
                      <GapBadge gaps={result.gaps} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
