#!/usr/bin/env python3
"""
Step 4 — converts master_seasons.csv into the JSON the Next.js app imports
directly (data/heisman-ledger/master/master_seasons.json). Kept as its own
step, not inlined into merge_dataset.py, so the CSV stays the human-readable
source of truth and the JSON is always a reproducible build artifact of it.

A couple of the hand-verified rows carry an approximate total like "414+"
(a season whose full PF/PA can't be summed yet — see the source_notes for
why) rather than a clean integer. Never truncated to an int silently: kept
as the parsed floor value plus an explicit `*_is_approximate` flag, so the
Power Index module can choose to exclude an approximate season from
z-score math rather than treat a lower bound as an exact total.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

# This file lives at scripts/heisman_ledger/csv_to_json.py -- three parents
# up is the repo root. Anchoring --src/--out's defaults here, rather than
# to a plain relative "../../data/...", means they resolve correctly no
# matter what directory this script is invoked from -- a relative default
# silently resolves against the process's cwd, not the script's own
# location, and writes outside the repo when run from somewhere other than
# scripts/heisman_ledger.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

INT_FIELDS = (
    "year",
    "data_tier",
    "offense_total_yards",
    "offense_rushing_yards",
    "offense_passing_yards",
    "offense_turnovers",
)
APPROXIMATE_INT_FIELDS = ("points_for", "points_against")
FLOAT_FIELDS = (
    "offense_ppa",
    "defense_ppa",
    "offense_success_rate",
    "defense_success_rate",
    "sp_overall",
    "sp_offense",
    "sp_defense",
)

APPROX_RE = re.compile(r"^(\d+)\+?$")


def parse_approximate_int(value: str) -> tuple[int | None, bool]:
    match = APPROX_RE.match(value.strip())
    if not match:
        return None, False
    return int(match.group(1)), value.strip().endswith("+")


def convert(src: Path, out: Path) -> int:
    rows = []
    with src.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            clean: dict = {}
            for k, v in row.items():
                if v in (None, ""):
                    clean[k] = None
                elif k in INT_FIELDS:
                    # int(v) directly would choke on a CFBD stat value that
                    # round-tripped through the CSV as "5234.0" — same
                    # tolerant parse merge_dataset.py already uses.
                    clean[k] = int(float(v))
                elif k in APPROXIMATE_INT_FIELDS:
                    value, is_approx = parse_approximate_int(v)
                    clean[k] = value
                    clean[f"{k}_is_approximate"] = is_approx
                elif k in FLOAT_FIELDS:
                    clean[k] = float(v)
                else:
                    clean[k] = v
            for k in APPROXIMATE_INT_FIELDS:
                clean.setdefault(f"{k}_is_approximate", False)
            rows.append(clean)

    out.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    return len(rows)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=REPO_ROOT / "data/heisman-ledger/master/master_seasons.csv")
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "data/heisman-ledger/master/master_seasons.json")
    args = parser.parse_args()

    count = convert(args.src, args.out)
    print(f"wrote {count} rows to {args.out}")
