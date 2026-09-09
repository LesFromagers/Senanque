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
  3. No Consensus All-Americans table or heading at all -- only
     per-position bulleted prose ("* '''[[Name]]''', School <small>
     (selectors)</small>"), grouped under headings that vary by era
     (some pages nest positions straight under the lead with no top-level
     grouping at all, e.g. 1895; others group under "==Offense==="/
     "==Defense==", or "==Offensive selections==="/"==Defensive
     selections=="). extract_bulleted_all_americans() walks every heading
     in the page rather than assuming one specific top-level name, and
     skips a "==Key==" section's own selector-glossary bullets (which
     look like player rows but aren't). Within this format, a player's
     consensus status is signaled one of two confirmed ways:
       a. Bold name = consensus, trusted only when the specific page's
          own text documents that convention -- either in its intro
          prose (2008: "...to determine consensus All-Americans (denoted
          '''bold''')") or, more commonly, a dedicated "==Key==" section
          in the opposite word order (1895/1968/1978/1992-era: "'''Bold'''
          -- Consensus All-American"). BOLD_LEGEND_RE matches either
          order so it isn't silently missed on pages using the second
          phrasing, which the original single-direction version of this
          regex was.
       b. An explicit "-- CONSENSUS --"/"-- UNANIMOUS --" marker inside
          the entry's own <small>...</small> selector detail (2010s-era
          pages, e.g. 2010/2011/2013) -- self-documenting, no separate
          legend needed; CONSENSUS_MARKER_RE catches this independently
          of bold, so a page using only this convention still resolves.
     A page with neither signal anywhere is left unresolved and logged as
     a gap, not guessed.

Every one of these was independently sanity-checked by hand against
several seasons per format before this script existed, per Matt's
explicit request -- see the 2026-09-09 session notes / CLAUDE.md's
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



# Two real, independently-confirmed ways a bulleted-format page (see
# format 3 in this module's docstring) documents that bold = consensus.
# Checked against live pages, not assumed to be the only phrasing after
# just one page: 2008's page states the convention in its own intro
# prose ("...to determine consensus All-Americans (denoted '''bold''')"
# -- "consensus" before "bold"), while most other bulleted-format pages
# instead carry a dedicated "==Key==" section phrased the opposite order
# ("'''Bold''' -- Consensus All-American", confirmed on 1895/1968/1978/
# 1992's live pages) or with an "=" instead of an en dash. An
# order-locked regex (the original version of this check) matched the
# first phrasing and silently missed the second on every page that uses
# it -- this one matches either order, within a bounded window so it
# doesn't false-positive on two unrelated "bold" and "consensus"
# mentions that happen to land in the same article.
BOLD_LEGEND_RE = re.compile(r"consensus.{0,80}bold|bold.{0,80}consensus", re.IGNORECASE | re.DOTALL)

# A second, independent, self-documenting signal seen on many 2010s-era
# pages (confirmed live on 2010/2011/2013): each consensus/unanimous
# player's own <small>...</small> selector detail carries an explicit
# "-- CONSENSUS --" or "-- UNANIMOUS --" marker inline, rather than (or
# alongside) bold. This needs no separate legend text to trust -- the
# page states the player's status directly, per player -- so a line
# carrying this marker counts as consensus regardless of whether
# BOLD_LEGEND_RE found a documented bold convention anywhere else on the
# page. Every marked player observed on these pages was also bold, so
# this doesn't change what gets extracted there; it's what lets a page
# with markers but no bold legend (2010/2011) resolve at all instead of
# being left unresolved.
CONSENSUS_MARKER_RE = re.compile(r"--\s*(?:CONSENSUS|UNANIMOUS)\s*--", re.IGNORECASE)


def parse_bullet_line(line: str) -> Optional[dict]:
    """
    Parses one "* '''[[Name]]''', School <small>(selectors)</small>"
    bullet line -- the format-3 fallback (see module docstring). The
    trailing <small>...</small> selector detail is stripped before
    cleaning so it can't get folded into the name/school split; name and
    school are then just "everything before the first comma" / "after it."

    is_consensus is true if the line carries the explicit CONSENSUS_MARKER_RE
    marker (self-documenting, no page-level legend needed) or is simply
    bold (trusted only when the caller has confirmed, via BOLD_LEGEND_RE
    or a marker found elsewhere on the page, that this specific page
    documents bold as meaning consensus -- see oklahoma_consensus_all_americans()).
    """
    stripped = line.strip()
    if not stripped.startswith("*"):
        return None
    content = stripped[1:].strip()
    has_marker = bool(CONSENSUS_MARKER_RE.search(content))
    is_bold = content.startswith("'''")
    before_small = re.split(r"<small>", content, maxsplit=1)[0]
    cleaned = clean(before_small).strip()
    if "," not in cleaned:
        return None
    name, school = cleaned.split(",", 1)
    name, school = name.strip(), school.strip()
    if not name or not school:
        return None
    return {"name": name, "school": school, "consensus": has_marker or is_bold}


HEADING_RE = re.compile(r"^(={2,3})\s*(.+?)\s*\1\s*$")

# Section headings that hold real player rosters vs. ones that just look
# like them (a "==Key==" section's own bullets -- "'''Bold''' -- Consensus
# All-American", "AFCA = American Football Coaches Association" -- follow
# the same "* text" shape a player line does). Confirmed live: "Key" and
# its child "Official/Unofficial/Other selectors" subsections are the
# only non-roster bulleted content seen on any of these pages; every
# other heading (Offense, Defense, Special teams, Quarterback, Ends, ...)
# only ever contains real player entries.
NON_ROSTER_HEADINGS = {"key", "official selectors", "unofficial selectors", "other selectors"}
STOP_HEADINGS = {"see also", "references", "notes"}


def extract_bulleted_all_americans(text: str) -> list[dict]:
    """
    Walks every heading in the page (not just a slice bounded by a
    specific top-level heading string) so it survives real structural
    variation across eras -- confirmed live: some pages group positions
    under "==Offense==="/"==Defense==", others under "==Offensive
    selections==="/"==Defensive selections==", others (1895) under no
    grouping heading at all, position subsections straight under the
    lead. Skips NON_ROSTER_HEADINGS' own bulleted content (the Key
    section's legend/selector-glossary lines look like player rows but
    aren't) and stops entirely at the first STOP_HEADINGS section.
    """
    results: list[dict] = []
    current_position = None
    skip = False
    lines = text.splitlines()
    # Start at the first heading -- skips the lead paragraph/infobox,
    # where a stray "* " line (if any) was never observed to be a player.
    start = 0
    for i, line in enumerate(lines):
        if HEADING_RE.match(line.strip()):
            start = i
            break

    for line in lines[start:]:
        heading_match = HEADING_RE.match(line.strip())
        if heading_match:
            level, title = heading_match.group(1), heading_match.group(2)
            lowered = title.strip().lower()
            if lowered in STOP_HEADINGS:
                break
            if lowered in NON_ROSTER_HEADINGS:
                skip = True
                continue
            skip = False
            if len(level) == 3:  # position-level heading, e.g. ===Quarterback===
                current_position = title.strip()
            continue
        if skip:
            continue
        parsed = parse_bullet_line(line)
        if parsed:
            parsed["position"] = current_position
            results.append(parsed)
    return results


SCHOOL_ANNOTATION_RE = re.compile(r"\s*\([^)]*\)\s*$")


def normalize_school(school: str) -> str:
    """
    Strips a trailing parenthetical annotation -- confirmed on live pages:
    "Miami  (CFHOF)" (a College Football Hall of Fame flag riding along in
    the same cell/bullet as the school name). Without this, an OU player
    who happens to be a Hall-of-Famer would read as school "Oklahoma
    (CFHOF)" and silently fail the exact "Oklahoma" match below -- a real
    player dropped, not a genuine zero.
    """
    return SCHOOL_ANNOTATION_RE.sub("", school).strip()


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
    genuinely unresolved (no page, or a page whose bulleted format
    carries no trustworthy consensus signal at all) -- an empty list is a
    real, checked "zero OU consensus All-Americans that season," not a
    failure to find data. status is one of: "table", "bulleted",
    "no_page", "no_consensus_signal_found", "no_players_parsed".
    """
    text = fetch_all_america_page(session, year)
    if not text:
        return None, "no_page"

    section = find_consensus_section(text)
    if section:
        players = extract_school_players(section)
        # Exact match on "Oklahoma" -- "Oklahoma State" must never match
        # (both schools appear on the same page in most years).
        oklahoma = [p for p in players if normalize_school(p["school"]) == "Oklahoma"]
        return oklahoma, "table"

    # No dedicated Consensus All-Americans table/heading at all -- only
    # trust bold formatting as a consensus signal when this specific page
    # gives real evidence for it: either its own text documents the
    # bold-means-consensus convention (BOLD_LEGEND_RE), or individual
    # entries carry an explicit "-- CONSENSUS --"/"-- UNANIMOUS --" marker
    # that needs no separate documentation (CONSENSUS_MARKER_RE) -- see
    # both regexes' docstrings for the live pages that confirmed each.
    # Never assumed for a page with neither.
    if not (BOLD_LEGEND_RE.search(text) or CONSENSUS_MARKER_RE.search(text)):
        return None, "no_consensus_signal_found"
    all_players = extract_bulleted_all_americans(text)
    if not all_players:
        # The page passed the consensus-signal gate but nothing parsed as
        # a player row at all -- a real extraction failure (unrecognized
        # sub-structure), not evidence of a genuine zero. Left unresolved
        # rather than silently reported as "0 OU consensus All-Americans."
        return None, "no_players_parsed"
    oklahoma = [p for p in all_players if p["consensus"] and normalize_school(p["school"]) == "Oklahoma"]
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
        "no_consensus_signal_found": "page found, but no Consensus All-Americans table/heading, no "
        "documented bold-means-consensus convention, and no explicit CONSENSUS/UNANIMOUS marker -- "
        "format not recognized, left unresolved rather than guessed",
        "no_players_parsed": "page found and documents a consensus signal, but no player rows parsed "
        "from its bulleted sections -- an unrecognized sub-structure, left unresolved rather than guessed",
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
