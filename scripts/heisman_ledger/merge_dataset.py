#!/usr/bin/env python3
"""
Step 3 — merge the hand-verified 27 seasons, the Wikipedia bulk pull, and
the CFBD efficiency pull into one master dataset.

The verified CSV always wins a field-level conflict. Nothing here
recomputes or overwrites a value a human already checked; the bulk pull
only fills in seasons the verified file doesn't cover, and CFBD only adds
columns the other two don't have.
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Optional

from schema import GAME_FIELDS, SEASON_FIELDS

# SP+/PPA and the raw counting stats come from two different CFBD endpoints
# that fail independently (see pull_cfbd.py) — kept as separate lists so a
# year with season totals but no SP+ rating still keeps its yardage instead
# of losing it because the *other* endpoint happened to come back empty.
CFBD_EFFICIENCY_FIELDS = [
    "offense_ppa",
    "defense_ppa",
    "offense_success_rate",
    "defense_success_rate",
    "sp_overall",
    "sp_offense",
    "sp_defense",
]

CFBD_COUNTING_FIELDS = [
    "offense_total_yards",
    "offense_rushing_yards",
    "offense_passing_yards",
    "offense_turnovers",
]

MASTER_FIELDS = SEASON_FIELDS + CFBD_EFFICIENCY_FIELDS + CFBD_COUNTING_FIELDS


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def to_int_or_none(value: Optional[str]) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verified", type=Path, required=True)
    parser.add_argument("--pulled", type=Path, required=True, help="Directory with seasons_wikipedia.csv, games_wikipedia.csv, efficiency_cfbd.csv")
    parser.add_argument("--out", type=Path, required=True, help="Directory to write master_seasons.csv, master_games.csv, gap_report_master.md")
    args = parser.parse_args()

    verified_rows = read_csv(args.verified)
    pulled_rows = read_csv(args.pulled / "seasons_wikipedia.csv")
    games_rows = read_csv(args.pulled / "games_wikipedia.csv")
    cfbd_rows = read_csv(args.pulled / "efficiency_cfbd.csv")

    verified_years = {int(r["year"]) for r in verified_rows}
    cfbd_by_year = {int(r["year"]): r for r in cfbd_rows}

    # Verified rows win outright for every field they actually have a
    # value for; pulled rows fill every year the verified file doesn't
    # cover at all. For a year the verified file *does* cover, the pulled
    # row is still consulted field-by-field — but only to fill a field the
    # verified row left blank, never to replace one it already populated.
    # (An earlier version of this script discarded the pulled row entirely
    # whenever the year was already verified, which silently dropped every
    # gap-filling field a supplemental Wikipedia pull found for the 27
    # verified seasons — not what "fill their existing gaps, never
    # overwrite verified data" means.)
    merged: dict[int, dict] = {}
    for row in verified_rows:
        merged[int(row["year"])] = dict(row)

    filled_fields: dict[int, list[str]] = {}
    for row in pulled_rows:
        year = int(row["year"])
        if year not in verified_years:
            merged[year] = dict(row)
            continue
        target = merged[year]
        for field in SEASON_FIELDS:
            if field == "year":
                continue
            if target.get(field) in (None, "") and row.get(field) not in (None, ""):
                target[field] = row[field]
                filled_fields.setdefault(year, []).append(field)

    gap_lines: list[str] = [
        "# Heisman Park Ledger — Master Gap Report",
        "",
        "Merge of the 27 hand-verified seasons + the Wikipedia bulk pull + the "
        "CFBD efficiency pull. Verified rows always win a conflict; this "
        "report only lists what's still missing after that merge.",
        "",
    ]

    master_rows = []
    for year in sorted(merged):
        row = merged[year]
        cfbd = cfbd_by_year.get(year)
        if cfbd:
            # Counting stats are copied whenever the CFBD row exists at all —
            # /stats/season succeeds or fails independently of /ratings/sp,
            # which is what actually gates data_tier below.
            for field in CFBD_COUNTING_FIELDS:
                row[field] = cfbd.get(field)
        if cfbd and cfbd.get("sp_overall") not in (None, ""):
            # A CFBD hit is what actually promotes a season to tier 1 — not
            # just "year >= 2005" on its own, in case CFBD has a gap.
            row["data_tier"] = "1"
            for field in CFBD_EFFICIENCY_FIELDS:
                row[field] = cfbd.get(field)
        elif year >= 2005:
            gap_lines.append(f"- **{year}**: expected CFBD efficiency data (Tier 1) but none was returned — check the pull, don't assume Tier 3.")

        missing = [
            f for f in ("head_coach", "conference", "final_record", "points_for", "points_against")
            if not row.get(f)
        ]
        if missing:
            gap_lines.append(f"- **{year}**: missing {', '.join(missing)}")

        for field in MASTER_FIELDS:
            row.setdefault(field, None)
        master_rows.append(row)

    args.out.mkdir(parents=True, exist_ok=True)
    seasons_csv = args.out / "master_seasons.csv"
    with seasons_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_FIELDS)
        writer.writeheader()
        for row in master_rows:
            writer.writerow({k: row.get(k) for k in MASTER_FIELDS})

    games_csv = args.out / "master_games.csv"
    with games_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=GAME_FIELDS)
        writer.writeheader()
        writer.writerows(games_rows)

    if filled_fields:
        gap_lines.append("")
        gap_lines.append("## Verified-season fields filled from the Wikipedia re-pull")
        gap_lines.append(
            "Only fields the verified CSV left genuinely blank were filled below — every "
            "field the verified batch already had a value for was left untouched, no exceptions."
        )
        for year in sorted(filled_fields):
            gap_lines.append(f"- **{year}**: {', '.join(filled_fields[year])}")

    verified_years_with_games = {int(g["year"]) for g in games_rows if int(g["year"]) in verified_years}
    verified_years_without_games = sorted(verified_years - verified_years_with_games)
    if verified_years_with_games:
        gap_lines.append("")
        gap_lines.append(
            f"## Game-level data now exists for {len(verified_years_with_games)} of the "
            f"{len(verified_years)} verified seasons"
        )
        gap_lines.append(
            "A prior version of this report claimed no per-game opponent/score list existed "
            "for any of the 27 verified seasons — true before a Wikipedia re-pull "
            "(--include-verified) was run against them, not true anymore. This only gives OU's "
            "own schedule and scores, though, not each opponent's own season game log — the "
            "SRS/strength-of-schedule layer of the Power Index still can't compute an "
            "opponent-adjusted margin without that second-order pull (see "
            "`gap_report_verified_batch.md`'s \"Not started at all\" section and "
            "power-index.ts's header comment). The Power Index module falls back to the "
            "unadjusted point-differential z-score alone for every season, verified or not, "
            "until that's built, and flags it rather than guessing an SOS adjustment."
        )
        if verified_years_without_games:
            gap_lines.append(
                f"Still missing a game log even after the re-pull: {', '.join(map(str, verified_years_without_games))}."
            )
    elif verified_years:
        gap_lines.append("")
        gap_lines.append(
            f"## Known structural gap: no game-level data for the {len(verified_years)} "
            "verified seasons"
        )
        gap_lines.append(
            "The hand-verified batch is season-level only (no per-game opponent/score "
            "list was captured for those 27 seasons). The SRS/strength-of-schedule "
            "layer of the Power Index can't compute an opponent-adjusted margin for "
            "these seasons until that game log is added — same gap flagged in "
            "`gap_report_verified_batch.md`'s \"Not started at all\" section. "
            "The Power Index module falls back to the unadjusted point-differential "
            "z-score alone for any season with no game log, and flags it, rather "
            "than guessing an SOS adjustment."
        )

    (args.out / "gap_report_master.md").write_text("\n".join(gap_lines), encoding="utf-8")

    print(f"Wrote {len(master_rows)} seasons -> {seasons_csv}")
    print(f"Wrote {len(games_rows)} games -> {games_csv}")
    print(f"Gap report -> {args.out / 'gap_report_master.md'}")


if __name__ == "__main__":
    main()
