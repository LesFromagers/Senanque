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

  // Rank and Year are the frozen pair on mobile (task: keep both visible
  // while scrolling right for the wider stat columns). Every column below
  // gets an explicit width AND the table uses table-layout: fixed --
  // confirmed live this is required, not just tidy: in the default auto
  // layout, a `width` on a <td> is only ever a hint the browser can
  // override from a column's widest cell, and the Rank column's actual
  // rendered width came out to ~83px against the ~56px `w-14` asked for
  // (very likely the wax seal's absolutely-positioned span still
  // contributing to intrinsic sizing in this engine, despite being taken
  // out of flow) -- which silently broke the Year column's sticky `left`
  // offset (computed against the *intended* 56px, not the real one),
  // letting the two frozen columns overlap and show scrolled content
  // through the gap. table-fixed makes the header row's widths
  // authoritative, full stop, removing the ambiguity outright.
  const RANK_COL = "w-14"; // 3.5rem / 56px
  const YEAR_COL = "w-20"; // 5rem / 80px
  const YEAR_COL_LEFT = "left-14"; // must equal RANK_COL's width exactly
  const COACH_COL = "w-40";
  const RECORD_COL = "w-24";
  const INDEX_COL = "w-24";
  const PT_DIFF_COL = "w-28";
  const OFFENSE_COL = "w-24";
  const DEFENSE_COL = "w-24";
  const MARKS_COL = "w-36";
  // border-separate (see the <table> element below) only renders borders
  // set on <td>/<th> themselves, never on a <tr> -- these three replace
  // what used to be one className on each row/header <tr>.
  const ROW_BORDER = "border-b border-stone/20";
  const HEADER_ROW_BORDER = "border-b border-charcoal/20";

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
        {/* border-separate, not border-collapse: position: sticky on a
            <td>/<th> is unreliable in a border-collapse table (a real,
            documented browser limitation, not a style preference) --
            confirmed live, the frozen Rank/Year columns silently failed
            to pin and instead let scrolled content paint through/over
            them until this was fixed. border-spacing-0 keeps the same
            tight, no-gap look border-collapse gave. */}
        <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs tracking-label uppercase text-stone">
              {(
                [
                  ["rank", "Rank", RANK_COL],
                  ["year", "Year", YEAR_COL],
                  ["coach", "Head Coach", COACH_COL],
                  ["record", "Record", RECORD_COL],
                  ["powerIndex", "Index", INDEX_COL],
                  ["pointDiff", "Pt Diff/G", PT_DIFF_COL],
                  ["offense", "Off. Eff.", OFFENSE_COL],
                  ["defense", "Def. Eff.", DEFENSE_COL],
                  ["marks", "Marks", MARKS_COL],
                ] as const
              ).map(([key, label, widthCls]) => {
                // Rank and Year stay pinned during horizontal scroll (the
                // narrow columns you always want visible while comparing
                // the wider stat columns on a phone) -- bg-oat on the
                // sticky header cells is required, not decorative: without
                // an opaque background, scrolled-past header text shows
                // through underneath as the row slides by. Every column
                // (sticky or not) gets its own width class here because
                // table-fixed takes its column widths from THIS row alone
                // — a <td> width further down is decorative once the table
                // is fixed-layout, so the header is the only place these
                // constants actually need to be set.
                const stickyCls =
                  key === "rank"
                    ? `sticky left-0 z-20 bg-oat`
                    : key === "year"
                      ? `sticky ${YEAR_COL_LEFT} z-10 bg-oat border-r border-stone/30`
                      : "";
                return (
                  <th key={key} className={`whitespace-nowrap px-3 py-2 ${widthCls} ${HEADER_ROW_BORDER} ${stickyCls}`}>
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
                );
              })}
            </tr>
          </thead>
          <tbody className="font-mono">
            {sorted.map(({ result, season }) => {
              const isTop = topInContext?.season.year === season.year;
              return (
                <tr key={season.year} className={isTop ? "bg-lavender/20" : ""}>
                  <td
                    className={`sticky left-0 z-20 ${RANK_COL} ${ROW_BORDER} whitespace-nowrap px-3 py-3 align-middle ${isTop ? "bg-lavender/20" : "bg-oat"}`}
                  >
                    {result.rank}
                    {isTop && (
                      // The wax seal overlays the border between Rank and
                      // Year rather than sitting inline before the rank
                      // number -- half its width straddles into the Year
                      // column (translate-x-1/2 off the Rank cell's own
                      // right edge). It lives inside the Rank <td>, not as
                      // a separate element, specifically so it scrolls (or
                      // stays frozen, on mobile) together with the Rank
                      // column rather than needing its own sticky/position
                      // bookkeeping. z-20 on this cell (vs. the Year
                      // column's z-10) is what lets the overlap paint
                      // above Year's content instead of being clipped
                      // under it.
                      <span
                        className="pointer-events-none absolute right-0 top-1/2 z-30 h-9 w-9 -translate-y-1/2 translate-x-1/2"
                        aria-hidden="true"
                      >
                        <WaxSealIcon contextLabel={contextLabel} />
                      </span>
                    )}
                  </td>
                  <td
                    className={`sticky ${YEAR_COL_LEFT} z-10 ${ROW_BORDER} whitespace-nowrap border-r border-stone/30 py-3 pr-3 ${isTop ? "bg-lavender/20 pl-7" : "bg-oat pl-3"}`}
                  >
                    {/* isTop gets extra left padding (pl-7 vs. the usual
                        pl-3) so the wax seal's ~18px reach into this
                        column's left edge lands on padding, not on top of
                        the year digits themselves. */}
                    <Link
                      href={`/analytics/heisman-park-ledger/${season.year}`}
                      className="font-sans font-medium text-charcoal hover:text-plum hover:underline"
                    >
                      {season.year}
                    </Link>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 font-sans text-charcoal ${ROW_BORDER}`}>
                    {season.headCoach ?? "—"}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${ROW_BORDER}`}>{season.finalRecord ?? "—"}</td>
                  <td className={`whitespace-nowrap px-3 py-3 font-medium text-charcoal ${ROW_BORDER}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {result.powerIndex.toFixed(1)}
                      {season.heismanWinner && (
                        <span title={`Heisman winner: ${season.heismanWinner}`} className="text-gold">
                          <HeismanTrophyIcon className="h-4 w-4" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${ROW_BORDER}`}>
                    {result.pointDifferentialPerGame !== null ? result.pointDifferentialPerGame.toFixed(1) : "—"}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${ROW_BORDER}`}>
                    {season.offensePpa !== null ? season.offensePpa.toFixed(2) : season.pointsFor !== null ? `${season.pointsFor} PF` : "—"}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${ROW_BORDER}`}>
                    {season.defensePpa !== null ? season.defensePpa.toFixed(2) : season.pointsAgainst !== null ? `${season.pointsAgainst} PA` : "—"}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${ROW_BORDER}`}>
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
