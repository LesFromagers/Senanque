#!/usr/bin/env python3
"""
Pull OU's team-season SP+/efficiency data from the College Football Data
API, 2005-present, per Layer 1's Tier-1 efficiency source in the Cowork
brief. Merged into the master dataset by year in merge_dataset.py.

Reads CFBD_API_KEY from the environment only — never hardcode it, never
write it to a file, and never paste it into this script. Per CLAUDE.md's
cloud-session rule, this script should only ever be run somewhere the key
already lives (locally, after `export CFBD_API_KEY=...` from .env.local,
or in a CI/Vercel job) — not by pasting a real key into a Claude Code web
session.

Also pulls raw season counting stats (total/rushing/passing yards,
turnovers) from api/stats/season — OU's own offensive output, since that
endpoint doesn't split by offense/defense. There's no matching single call
for yards *allowed*: CFBD's season-stats endpoint only reports outcomes for
the team you query, not what its opponents managed against it. Getting a
real defensive-yardage-allowed number would mean pulling every opponent's
own season stats and reconciling by game, which is out of scope here — so
it's left null and logged as a gap rather than approximated. offense_ppa /
defense_ppa (the era- and opponent-adjusted efficiency numbers already
pulled below) remain the actual defensive-quality figures the Power Index
uses; the raw yardage fields here are supplementary context, not a Power
Index input.
"""
from __future__ import annotations

import argparse
import csv
import os
import time
from pathlib import Path
from typing import Optional

import requests

# This file lives at scripts/heisman_ledger/pull_cfbd.py -- three parents up
# is the repo root. Anchoring --out's default here, rather than to a plain
# relative "../../data/...", means it resolves correctly no matter what
# directory this script is invoked from (repo root, scripts/heisman_ledger,
# or anywhere else) -- a relative default silently resolves against the
# process's cwd, not the script's own location, and writes outside the repo
# when run from somewhere other than this directory.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

API_BASE = "https://api.collegefootballdata.com"
TEAM = "Oklahoma"
FIRST_TIER1_YEAR = 2005

# CFBD's api/stats/season category names -> our column names. Confirm these
# exact category strings against a live response the first time this runs
# (this sandbox has no network access to verify against the real API) —
# an unmatched category just leaves that column null, it won't crash the
# pull, but it's worth a spot-check on year 1 of a real run.
STATS_SEASON_CATEGORIES = {
    "totalYards": "offense_total_yards",
    "rushingYards": "offense_rushing_yards",
    "netPassingYards": "offense_passing_yards",
    "turnovers": "offense_turnovers",
}

CFBD_FIELDS = [
    "year",
    "offense_ppa",  # predicted points added per play, offense
    "defense_ppa",  # predicted points added per play, defense (lower is better)
    "offense_success_rate",
    "defense_success_rate",
    "sp_overall",
    "sp_offense",
    "sp_defense",
    "offense_total_yards",
    "offense_rushing_yards",
    "offense_passing_yards",
    "offense_turnovers",
    "notes",
]


def fetch_json(session: requests.Session, path: str, params: dict) -> Optional[list | dict]:
    resp = session.get(f"{API_BASE}{path}", params=params, timeout=20)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def pull_year(session: requests.Session, year: int) -> dict:
    row = {"year": year, "notes": ""}

    # SP+ ratings (api/ratings/sp) — one row per team per year.
    sp = fetch_json(session, "/ratings/sp", {"year": year, "team": TEAM})
    if sp:
        entry = sp[0] if isinstance(sp, list) and sp else None
        if entry:
            row["sp_overall"] = entry.get("rating")
            offense = entry.get("offense") or {}
            defense = entry.get("defense") or {}
            row["sp_offense"] = offense.get("rating")
            row["sp_defense"] = defense.get("rating")
    if row.get("sp_overall") is None:
        row["notes"] += f"no SP+ rating returned for {year}; "

    # Advanced season stats (api/stats/season/advanced) — PPA and success rate.
    adv = fetch_json(session, "/stats/season/advanced", {"year": year, "team": TEAM})
    if adv:
        entry = adv[0] if isinstance(adv, list) and adv else None
        if entry:
            offense = entry.get("offense") or {}
            defense = entry.get("defense") or {}
            row["offense_ppa"] = offense.get("ppa")
            row["defense_ppa"] = defense.get("ppa")
            row["offense_success_rate"] = offense.get("successRate")
            row["defense_success_rate"] = defense.get("successRate")
    if row.get("offense_ppa") is None:
        row["notes"] += f"no advanced-stats PPA returned for {year}; "

    # Raw season counting stats (api/stats/season) — total/rushing/passing
    # yards, turnovers. OU's own offensive output only; see the module
    # docstring for why there's no matching "yards allowed" pull here.
    stats = fetch_json(session, "/stats/season", {"year": year, "team": TEAM})
    returned: dict[str, object] = {}
    if isinstance(stats, list):
        for entry in stats:
            if isinstance(entry, dict) and entry.get("statName") is not None:
                returned[str(entry["statName"])] = entry.get("statValue")

    for category, column in STATS_SEASON_CATEGORIES.items():
        row[column] = returned.get(category)

    missing = [cat for cat, col in STATS_SEASON_CATEGORIES.items() if row.get(col) is None]
    if missing:
        # The point of naming what CFBD *did* return: a statName spelling
        # change is diagnosable straight from the CSV, without re-running
        # the pull to find out what broke.
        if returned:
            row["notes"] += (
                f"{year}: no value for statName(s) {', '.join(sorted(missing))}; "
                f"CFBD returned {len(returned)} statNames instead: {', '.join(sorted(returned))}; "
            )
        else:
            row["notes"] += f"{year}: /stats/season returned no rows at all; "

    for field in CFBD_FIELDS:
        row.setdefault(field, None)
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "data/heisman-ledger/pulled")
    parser.add_argument("--start", type=int, default=FIRST_TIER1_YEAR)
    parser.add_argument("--end", type=int, default=2025)
    parser.add_argument("--sleep", type=float, default=0.5)
    args = parser.parse_args()

    api_key = os.environ.get("CFBD_API_KEY")
    if not api_key:
        raise SystemExit(
            "CFBD_API_KEY is not set in the environment. Export it from your "
            "local .env.local before running this script — never paste the "
            "key value into a file or into a Claude Code web session."
        )

    args.out.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {api_key}"
    session.headers["User-Agent"] = "SenanqueHeismanLedgerBot/1.0 (https://senanque.dev)"

    rows = []
    years = list(range(args.start, args.end + 1))
    for i, year in enumerate(years):
        print(f"[{i + 1}/{len(years)}] pulling CFBD data for {year}...")
        rows.append(pull_year(session, year))
        time.sleep(args.sleep)

    out_csv = args.out / "efficiency_cfbd.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CFBD_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} seasons -> {out_csv}")


if __name__ == "__main__":
    main()
