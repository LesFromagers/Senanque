#!/usr/bin/env python3
"""
Pull OU's NCAA-consensus All-Americans for the Talent layer, one season at
a time, from Wikipedia's "{year} College Football All-America Team" pages
(separate from the "{year} Oklahoma Sooners football team" pages
pull_wikipedia.py reads). Same source, same etiquette as that script: the
Wikipedia REST/action API is CC BY-SA and built for reuse, real
User-Agent, ~1-2 req/sec throttle.

Why this exists as its own script rather than a section of
pull_wikipedia.py: the two pulls hit structurally different pages (one
per OU season, one per national All-America class), and the OU season
page's own "All-Americans" mentions were checked first and found
essentially absent -- present as free text for only 12 of 131 seasons
(all 12 from the hand-verified batch, 0 recovered from prose on any
pulled season), with 39 more pulled seasons whose Wikipedia text mentions
All-Americans without ever being extracted. That's what
parse_awards()'s existing "All-Americans not auto-extracted" gap in
pull_wikipedia.py already flags -- this script is what fills it, from the
real source: the national All-America team page, which carries the
NCAA's own consensus designation directly, not a prose mention.

Consensus, not every selection: CLAUDE.md's Talent layer wants NCAA-
consensus All-Americans specifically -- a player recognized by enough of
the season's major selector organizations to count as a true consensus
pick, not merely named by any one outlet. Confirmed across three real,
structurally different page eras by fetching live pages directly (never
assumed from an offline fixture):

  1. Flat table, captioned "Consensus All-Americans" (2003-era) -- no
     "==Consensus All-Americans==" heading at all, just a wikitable with
     that caption. Names are wrapped in {{sortname|First|Last|SortKey}}
     templates, which mwparserfromhell's strip_code() can't expand -- it
     silently discards the whole template, leaving only a stray "*"
     (the unanimous-selection marker) as the cell's visible text.
     extract_name() below special-cases the sortname template directly.
     This era's table also uses rowspan to group multiple players under
     one shared Position cell (confirmed: 2003's four-man defensive line
     shares one rowspan="4" cell) -- a naive per-row cell lookup drops
     every row after the first under a span; extract_school_players()
     carries a spanned cell forward via an explicit active-spans state
     machine instead.
  2. "==Consensus All-Americans==" heading followed by a wikitable
     (1950/1956/1985-era). Header <th> cells aren't always wrapped in a
     <tr> (no leading "|-" before them on some pages) -- headers are read
     via filter_tags(matches=... tag == "th") directly, independent of
     <tr> grouping; data rows are found via <tr> -> <td> only, which
     naturally excludes a <th>-only header row either way.
  3. No Consensus All-Americans table or heading at all (2008) -- only
     per-position bulleted prose ("* '''[[Name]]''', School <small>
     (selectors)</small>"), bold name = consensus. Only trusted when the
     specific page's own intro text documents that convention (2008's
     does, near-verbatim: "denoted '''bold'''... At least three of these
     five major selector organizations must select a player") --
     BOLD_LEGEND_RE below gates this fallback path so it's never assumed
     silently for a page that doesn't state it. A page with neither a
     table/heading match nor a documented bold convention is left
     unresolved and logged as a gap, not guessed.

Every one of these was independently sanity-checked by hand against 5
seasons (2003, 1985, 2008, 1950, 1956) before this script existed, per
Matt's explicit request -- see the 2026-09-09 session notes / CLAUDE.md's
Heisman Park Ledger sourcing section for the confirmed results, including
the concrete case (1950) where the hand-verified batch's free-text
notable_all_americans column turned out to overcount relative to true
NCAA consensus status.

Never fabricates: a year whose All-America team page doesn't resolve, or
resolves but matches none of the three known formats, is left out of the
output CSV entirely and logged to the gap report -- never assumed to be
"zero All-Americans that year." A year that resolves and is genuinely
parsed with zero Oklahoma players (a real, checked outcome) gets an
explicit empty-string row instead, which is different from being absent.
"""
from __future__ import annotations

import argparse
import csv
import re
import time
from pathlib import Path
from typing import Optional

import mwparserfromhell as mwph
import requests

from pull_wikipedia import API_URL, USER_AGENT, clean, fetch_wikitext  # noqa: F401 (API_URL re-exported for callers)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

FIRST_SEASON = 1895

# Tried in order per year, same defensive-fallback pattern as
# pull_wikipedia.py's TITLE_PATTERNS -- "Team" is the confirmed live
# spelling for every year checked by hand; "team" is kept only in case a
# stray year's article was never given the redirect. Wikipedia's own
# "redirects": 1 API param (inside fetch_wikitext) already resolves most
# casing/naming drift on its own; this list is a second line of defense,
# not a guess at a fourth pattern.
TITLE_PATTERNS = [
    "{year} College Football All-America Team",
    "{year} College Football All-America team",
]

LEVEL2_HEADING_RE = re.compile(r"\n==[^=]")


def find_consensus_section(text: str) -> str:
    """
    Returns the wikitext slice holding the Consensus All-Americans
    table(s): either a "==Consensus All-Americans==" heading through the
    next level-2 heading (format 2 above), or -- when there's no such
    heading -- a table simply captioned "Consensus All-Americans" (format
    1). Returns "" if neither is found, which the caller treats as "try
    the bulleted-prose fallback, or give up."
    """
    heading_match = re.search(r"==\s*Consensus All-Americans\s*==", text)
    if heading_match:
        start = heading_match.end()
        next_heading = LEVEL2_HEADING_RE.search(text, start)
        end = next_heading.start() if next_heading else len(text)
        return text[start:end]

    caption_match = re.search(r"\|\+[^\n]*Consensus All-Americans", text)
    if caption_match:
        table_start = text.rfind("{|", 0, caption_match.start())
        table_end = text.find("|}", caption_match.end())
        if table_start != -1 and table_end != -1:
            return text[table_start : table_end + 2]

    return ""


def extract_name(cell) -> tuple[str, bool]:
    """
    Returns (name, is_unanimous). Handles the two real cell formats seen
    across eras: a plain [[wikilink]] (older pages -- clean() handles
    this natively), and a {{sortname|First|Last|SortKey}} template (newer
    pages) that strip_code() can't expand -- see this module's docstring.
    """
    is_unanimous = "*" in str(cell.contents)
    for template in cell.contents.filter_templates(recursive=True):
        if template.name.strip().lower() == "sortname":
            positional = [p for p in template.params if not p.showkey]
            if len(positional) >= 2:
                first = clean(str(positional[0].value))
                last = clean(str(positional[1].value))
                return f"{first} {last}".strip(), is_unanimous
    return clean(str(cell.contents)).replace("*", "").strip(), is_unanimous


def get_rowspan(cell) -> int:
    for attr in cell.attributes:
        if attr.name.strip().lower() == "rowspan":
            try:
                return int(str(attr.value).strip())
            except ValueError:
                return 1
    return 1


def extract_school_players(section_text: str) -> list[dict]:
    """
    Parses every wikitable in `section_text`. Header cells are read via
    <th> directly rather than via <tr> grouping (some pages don't wrap
    the header row in a <tr> at all -- see this module's docstring, format
    1 vs format 2). Data rows come from <tr> -> <td> only, which naturally
    skips a <th>-only header row either way.

    Carries a rowspanned cell forward across the rows it spans (an
    active_spans state machine, col -> (rows_remaining, cell)) so a
    player grouped under a shared Position cell isn't silently dropped --
    confirmed necessary on 2003's table, where a naive fixed-index lookup
    dropped every row after the first under a rowspan="4" Position cell.
    """
    wikicode = mwph.parse(section_text)
    tables = wikicode.filter_tags(matches=lambda n: n.tag == "table")
    results: list[dict] = []
    for table in tables:
        header_cells = table.contents.filter_tags(matches=lambda n: n.tag == "th")
        headers = [clean(str(c.contents)).strip().lower() for c in header_cells]
        name_i = next((i for i, h in enumerate(headers) if h == "name"), None)
        school_i = next((i for i, h in enumerate(headers) if h in ("school", "university")), None)
        pos_i = next((i for i, h in enumerate(headers) if h == "position"), None)
        if name_i is None or school_i is None:
            continue  # not a Name/School table -- skip

        ncols = len(headers)
        rows = table.contents.filter_tags(matches=lambda n: n.tag == "tr")
        active_spans: dict[int, tuple[int, object]] = {}
        for row in rows:
            cells = row.contents.filter_tags(matches=lambda n: n.tag == "td")
            if not cells:
                continue

            full_row: list = [None] * ncols
            consumed = set()
            for col, (_remaining, cell) in active_spans.items():
                full_row[col] = cell
                consumed.add(col)

            cell_iter = iter(cells)
            new_spans: dict[int, int] = {}
            for col in range(ncols):
                if col in consumed:
                    continue
                try:
                    cell = next(cell_iter)
                except StopIteration:
                    break
                full_row[col] = cell
                span = get_rowspan(cell)
                if span > 1:
                    new_spans[col] = span - 1

            next_active_spans = {}
            for col, (remaining, cell) in active_spans.items():
                if remaining > 1:
                    next_active_spans[col] = (remaining - 1, cell)
            for col, remaining in new_spans.items():
                next_active_spans[col] = (remaining, full_row[col])
            active_spans = next_active_spans

            if full_row[name_i] is None or full_row[school_i] is None:
                continue
            name, is_unanimous = extract_name(full_row[name_i])
            school = clean(str(full_row[school_i].contents)).strip()
            position = (
                clean(str(full_row[pos_i].contents)).strip()
                if pos_i is not None and full_row[pos_i] is not None
                else None
            )
            if name:
                results.append({"name": name, "school": school, "position": position, "unanimous": is_unanimous})
    return results


BOLD_LEGEND_RE = re.compile(r"consensus[^.]*bold", re.IGNORECASE)


def parse_bullet_line(line: str) -> Optional[dict]:
    """
    Parses one "* '''[[Name]]''', School <small>(selectors)</small>"
    bullet line -- the format-3 fallback (see module docstring). The
    trailing <small>...</small> selector detail is stripped before
    cleaning so it can't get folded into the name/school split; name and
    school are then just "everything before the first comma" / "after it."
    """
    stripped = line.strip()
    if not stripped.startswith("*"):
        return None
    content = stripped[1:].strip()
    is_consensus = content.startswith("'''")
    before_small = re.split(r"<small>", content, maxsplit=1)[0]
    cleaned = clean(before_small).strip()
    if "," not in cleaned:
        return None
    name, school = cleaned.split(",", 1)
    name, school = name.strip(), school.strip()
    if not name or not school:
        return None
    return {"name": name, "school": school, "consensus": is_consensus}


def extract_bulleted_all_americans(section_text: str) -> list[dict]:
    results: list[dict] = []
    current_position = None
    for line in section_text.splitlines():
        heading_match = re.match(r"^===\s*(.+?)\s*===\s*$", line.strip())
        if heading_match:
            current_position = heading_match.group(1)
            continue
        parsed = parse_bullet_line(line)
        if parsed:
            parsed["position"] = current_position
            results.append(parsed)
    return results


def fetch_all_america_page(session: requests.Session, year: int) -> Optional[str]:
    for pattern in TITLE_PATTERNS:
        title = pattern.format(year=year)
        text = fetch_wikitext(session, title)
        if text:
            return text
    return None


def oklahoma_consensus_all_americans(
    session: requests.Session, year: int
) -> tuple[Optional[list[dict]], str]:
    """
    Returns (players, status). players is None only when the year is
    genuinely unresolved (no page, or a page that matches none of the
    three known formats) -- an empty list is a real, checked "zero OU
    consensus All-Americans that season," not a failure to find data.
    status is one of: "table", "bulleted", "no_page",
    "no_bold_legend_found", "no_offense_section_found".
    """
    text = fetch_all_america_page(session, year)
    if not text:
        return None, "no_page"

    section = find_consensus_section(text)
    if section:
        players = extract_school_players(section)
        # Exact match on "Oklahoma" -- "Oklahoma State" must never match
        # (both schools appear on the same page in most years).
        oklahoma = [p for p in players if p["school"].strip() == "Oklahoma"]
        return oklahoma, "table"

    # No dedicated Consensus All-Americans table/heading at all -- only
    # trust the bold-means-consensus fallback when this specific page's
    # own text documents that convention. Never assumed for a page that
    # doesn't state it.
    if not BOLD_LEGEND_RE.search(text):
        return None, "no_bold_legend_found"
    offense_start = text.find("\n==Offense==")
    if offense_start == -1:
        return None, "no_offense_section_found"
    end_candidates = [i for i in (text.find("\n==See also=="), text.find("\n==References==")) if i != -1]
    end = min(end_candidates) if end_candidates else len(text)
    all_players = extract_bulleted_all_americans(text[offense_start:end])
    oklahoma = [p for p in all_players if p["consensus"] and p["school"] == "Oklahoma"]
    return oklahoma, "bulleted"


def format_players(players: list[dict]) -> str:
    parts = []
    for p in players:
        parts.append(f"{p['name']} ({p['position']})" if p.get("position") else p["name"])
    return "; ".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "data/heisman-ledger/pulled")
    parser.add_argument("--start", type=int, default=FIRST_SEASON)
    parser.add_argument("--end", type=int, default=2025)
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.75,
        help="Seconds between requests (brief asks for ~1-2 req/sec, i.e. 0.5-1.0s).",
    )
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    rows: list[dict] = []
    gaps: list[str] = []
    STATUS_REASON = {
        "no_page": "no All-America team page found for this year under any known title pattern",
        "no_bold_legend_found": "page found, but no Consensus All-Americans table/heading and no "
        "documented bold-means-consensus convention -- format not recognized, left unresolved rather than guessed",
        "no_offense_section_found": "page found and documents a bold-means-consensus convention, but its "
        "expected ==Offense== section wasn't found -- left unresolved rather than guessed",
    }

    years = list(range(args.start, args.end + 1))
    for i, year in enumerate(years):
        print(f"[{i + 1}/{len(years)}] pulling {year} All-America team page...")
        try:
            players, status = oklahoma_consensus_all_americans(session, year)
        except requests.RequestException as exc:
            gaps.append(f"- **{year}**: fetch error: {exc}")
            time.sleep(args.sleep)
            continue
        except Exception as exc:  # noqa: BLE001 -- one bad page's markup must not lose the whole run
            gaps.append(f"- **{year}**: unhandled parser error: {exc!r} -- needs a manual look")
            time.sleep(args.sleep)
            continue

        if players is None:
            gaps.append(f"- **{year}**: {STATUS_REASON[status]}")
        else:
            rows.append(
                {
                    "year": year,
                    "consensus_all_americans": format_players(players),
                    "consensus_all_american_count": len(players),
                }
            )
        time.sleep(args.sleep)

    out_csv = args.out / "consensus_all_americans_wikipedia.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["year", "consensus_all_americans", "consensus_all_american_count"])
        writer.writeheader()
        writer.writerows(rows)

    gap_report = args.out / "gap_report_all_americans.md"
    lines = [
        "# Heisman Park Ledger — Consensus All-Americans Gap Report",
        "",
        f"**Status:** {len(rows)} of {len(years)} seasons resolved (a resolved season may "
        "legitimately have 0 OU consensus All-Americans -- that's a real checked outcome, "
        "not a gap); "
        f"{len(gaps)} left unresolved below, never guessed.",
        "",
    ]
    lines.extend(gaps)
    gap_report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nWrote {len(rows)} seasons -> {out_csv}")
    print(f"Gap report -> {gap_report}")


if __name__ == "__main__":
    main()
