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
"""
from __future__ import annotations

import argparse
import csv
import os
import time
from pathlib import Path
from typing import Optional

import requests

API_BASE = "https://api.collegefootballdata.com"
TEAM = "Oklahoma"
FIRST_TIER1_YEAR = 2005

CFBD_FIELDS = [
    "year",
    "offense_ppa",  # predicted points added per play, offense
    "defense_ppa",  # predicted points added per play, defense (lower is better)
    "offense_success_rate",
    "defense_success_rate",
    "sp_overall",
    "sp_offense",
    "sp_defense",
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

    for field in CFBD_FIELDS:
        row.setdefault(field, None)
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("../../data/heisman-ledger/pulled"))
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
