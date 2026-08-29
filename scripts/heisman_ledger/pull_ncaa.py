#!/usr/bin/env python3
"""
Pull the NCAA's own national per-season major-college (FBS) scoring/
yardage averages from the NCAA Football Bowl Subdivision Records book
(PDF), published by the NCAA at fs.ncaa.org. Used as the era-normalization
baseline for the Power Index's point-differential z-score, per CLAUDE.md.
Writes data/heisman-ledger/national_baseline.json, consumed by
lib/heisman-ledger/national-baseline.ts.

Source: fs.ncaa.org/Docs/stats/football_records/FBS.pdf -- a static file
host under ncaa.org, not a crawlable site (no robots.txt at fs.ncaa.org;
the parent ncaa.org's robots.txt is wide open). This script fetches one
file, once; it doesn't crawl anything. Note: fs.ncaa.org only serves this
file over plain HTTP in practice (HTTPS SSL-handshakes fail against it
from this pipeline's network) -- that's the source's own behavior, not a
downgrade this script chooses.

The "Major-College Statistics Trends" table inside the PDF is one line per
season, 1937-present: the average across every counted major-college/FBS
team that year. This is literally the "national per-season scoring/
yardage averages" CLAUDE.md calls for, official-NCAA-sourced.

IMPORTANT finding, worth reading before touching the output: this table
has one "Pts." column, not separate national scoring-offense and
scoring-defense averages -- because in a (near-)closed system, every
point one counted team scores is a point some counted opponent allows, so
the national averages of points scored and points allowed per team are
essentially identical, every season. That makes the national average
SCORING MARGIN mathematically ~0 -- not a number this script extracts,
because there isn't one to extract; every row below sets
meanMarginPerGame to a literal 0.0 for this reason. See
lib/heisman-ledger/national-baseline.ts's doc comment for what this
does and doesn't change in the Power Index.

What this table does NOT provide: a national standard deviation of
scoring margin (only the average is ever published) -- stdDevMarginPerGame
is therefore always null. See the same doc comment for how
power-index.ts degrades gracefully instead of fabricating one.

Requires the `pdftotext` binary (poppler-utils) on PATH -- a real text
layer, not OCR, so this is exact extraction, never a guess:
  Debian/Ubuntu: apt-get install poppler-utils
  macOS:         brew install poppler

Never fabricates: a season this table doesn't cover (pre-1937, or a gap
in the source itself) is simply absent from the output, not filled with
a guess. Rerun this script whenever the NCAA publishes a new edition of
the records book to extend coverage forward.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

import requests

SOURCE_URL = "http://fs.ncaa.org/Docs/stats/football_records/FBS.pdf"
USER_AGENT = "SenanqueHeismanLedgerBot/1.0 (https://senanque.dev; https://github.com/LesFromagers/Senanque)"

TABLE_START = "MAJOR-COLLEGE STATISTICS TRENDS"
TABLE_END = "ADDITIONAL MAJOR-COLLEGE STATISTICS TRENDS"

YEAR_ROW = re.compile(r"^(19[3-9]\d|20\d\d)\b")
# The table's own footnote fills in the wartime seasons (points-only) as
# "YYYY (XX.X)" asides instead of table rows -- see parse_trends_table().
FOOTNOTE_YEAR = re.compile(r"(19\d\d)\s*\((\d+\.\d)\)")


def fetch_pdf(dest: Path) -> None:
    resp = requests.get(SOURCE_URL, headers={"User-Agent": USER_AGENT}, timeout=60)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def extract_text(pdf_path: Path) -> str:
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", str(pdf_path), "-"],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        raise SystemExit(
            "pdftotext not found on PATH -- install poppler-utils "
            "(apt-get install poppler-utils, or brew install poppler) and re-run."
        )
    return result.stdout


def parse_float(token: str) -> float | None:
    token = token.lstrip("*")
    if token in ("—", "-", ""):
        return None
    try:
        return float(token)
    except ValueError:
        return None


def parse_trends_table(text: str) -> dict[int, dict]:
    start = text.find(TABLE_START)
    end = text.find(TABLE_END, start if start != -1 else 0)
    if start == -1 or end == -1:
        raise SystemExit(
            f"Could not find the '{TABLE_START}' ... '{TABLE_END}' table in the PDF text -- "
            "the record book's layout may have changed; re-check this script against a fresh extract "
            "before trusting its output."
        )
    section = text[start:end]

    rows: dict[int, dict] = {}
    for line in section.splitlines():
        m = YEAR_ROW.match(line.strip())
        if not m:
            continue
        year = int(m.group(1))
        rest = line.strip().split()[1:]
        if len(rest) < 6:
            # A row too truncated to trust — skip it rather than guess at
            # which columns are actually present.
            continue
        rows[year] = {
            "meanMarginPerGame": 0.0,
            "stdDevMarginPerGame": None,
            "nationalAvgPointsPerGame": parse_float(rest[-1]),
            "nationalAvgTotalOffenseYardsPerGame": parse_float(rest[-5]),
            "nationalAvgTotalOffenseYardsPerPlay": parse_float(rest[-4]),
            "nationalAvgTotalOffensePlaysPerGame": parse_float(rest[-6]),
            "source": SOURCE_URL,
        }

    for year_str, pts_str in FOOTNOTE_YEAR.findall(section):
        year = int(year_str)
        if year not in rows:
            rows[year] = {
                "meanMarginPerGame": 0.0,
                "stdDevMarginPerGame": None,
                "nationalAvgPointsPerGame": float(pts_str),
                "nationalAvgTotalOffenseYardsPerGame": None,
                "nationalAvgTotalOffenseYardsPerPlay": None,
                "nationalAvgTotalOffensePlaysPerGame": None,
                "source": SOURCE_URL + " (wartime-seasons footnote, points-only)",
            }

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=Path("../../data/heisman-ledger/national_baseline.json"))
    parser.add_argument(
        "--pdf-cache",
        type=Path,
        default=Path("ncaa_fbs_records.pdf"),
        help="Local path to save/reuse the downloaded PDF -- re-running against the cached file skips the download.",
    )
    parser.add_argument("--force-download", action="store_true", help="Re-download even if --pdf-cache already exists.")
    args = parser.parse_args()

    if args.pdf_cache.exists() and not args.force_download:
        print(f"Using cached PDF at {args.pdf_cache} (pass --force-download to re-fetch)")
    else:
        print(f"Downloading {SOURCE_URL} ...")
        fetch_pdf(args.pdf_cache)

    text = extract_text(args.pdf_cache)
    rows = parse_trends_table(text)

    if not rows:
        raise SystemExit("Parsed zero seasons -- something is wrong with the table extraction; not overwriting real data with an empty result.")

    out_rows = {str(year): fields for year, fields in sorted(rows.items())}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        json.dump(out_rows, f, indent=2, sort_keys=True)
        f.write("\n")

    years = sorted(rows)
    missing = [y for y in range(years[0], years[-1] + 1) if y not in rows]
    print(f"\nWrote {len(rows)} seasons ({years[0]}-{years[-1]}) -> {args.out}")
    if missing:
        print(f"Gaps within that range not present in the source table: {missing}")


if __name__ == "__main__":
    main()
