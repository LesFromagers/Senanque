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
pick, not merely named by any one outlet.

PRIMARY METHOD -- the "Template:{year} ... Consensus All-Americans" navbox:
Wikipedia maintains a dedicated, curated navbox template per season (e.g.
Template:2003 NCAA Division I-A College Football Consensus All-Americans,
transcluded at the bottom of that year's main "College Football All-
America Team" article) whose sole job is listing exactly that season's
real consensus roster -- no bold-detection heuristics, no per-page prose
conventions to reverse-engineer, no ambiguity. Found by direct
investigation after a Google AI Overview surfaced 1994-2001 OU names this
script's earlier (bold/heading-only) version had missed entirely --
checking the actual primary source confirmed several of those names
(Rocky Calmus, Josh Heupel, J. T. Thatcher; 2000-2001) really are bold-
marked consensus picks on their pages, which is what sent the
investigation to this template in the first place. Confirmed present
across the full historical range under three naming eras
(TEMPLATE_TITLE_PATTERNS_BY_ERA): plain ("Template:1895/1937/1968 College
Football Consensus All-Americans"), Division I-A (1978-2005-ish), and
Division I FBS (2006-present, following the subdivision's real 2006
rename). The template itself carries no school affiliation per player, so
each entry is cross-referenced against the same year's main article body
(extract_all_named_players() below, gathering every player mentioned
anywhere in the roster -- any selector, any school -- regardless of bold
status) to find that player's school, matched primarily by wikilink
target (falls back to display name; NORMALIZE() strips periods/spacing so
"E.J. Henderson" in the template matches "E. J. Henderson" in the body --
confirmed live on 2001, a non-Oklahoma player, that this drift is real).
Table-derived body entries are kept in preference to bulleted-prose ones
on a duplicate key (see extract_all_named_players()'s docstring for why:
a 1985-era page's own unrelated "notable individual award winners" trivia
section can coincidentally match the same "Name, text-with-a-comma"
shape and, unfixed, silently overwrote a correct school with garbage --
confirmed live, this dropped both of 1985's real consensus picks to a
false zero before the fix). A template entry that still can't be matched
to any school gets one extra fetch of that player's own bio page,
checked for an "Oklahoma" mention (VERIFY_UNMATCHED_AGAINST_BIO) rather
than silently assumed to be some other school -- rare (one hit across
this script's ~13-season hand-validation pass, a Maryland linebacker) but
a real OU player hiding behind an unmatched entry would otherwise
silently undercount that season.

FALLBACK METHOD -- three structurally different eras of the main article's
own body, used only when no template resolves for that year at all (in
practice, not observed to happen across the full 1895-2025 range, but the
possibility isn't assumed away): flat "Consensus All-Americans"-captioned
table (2003-era, {{sortname}} templates + rowspan grouping), a
"==Consensus All-Americans==" heading + wikitable (1950/1956/1985-era),
or bulleted prose with bold = consensus, trusted only when the page's own
text documents that convention (BOLD_LEGEND_RE) or entries carry an
explicit "-- CONSENSUS --"/"-- UNANIMOUS --" marker (CONSENSUS_MARKER_RE,
2010s-era). See find_consensus_section()/extract_bulleted_all_americans()
for the format-by-format detail; kept as a safety net, not the primary
path, now that the template exists for every year checked.

Every one of these was independently sanity-checked by hand against
several seasons per format before this script existed, per Matt's
explicit request -- see the 2026-09-09 session notes / CLAUDE.md's
Heisman Park Ledger sourcing section for the confirmed results, including
the concrete case (1950) where the hand-verified batch's free-text
notable_all_americans column turned out to overcount relative to true
NCAA consensus status.

Never fabricates: a year whose All-America team page doesn't resolve
under either method is left out of the output CSV entirely and logged to
the gap report -- never assumed to be "zero All-Americans that year." A
year that resolves and is genuinely parsed with zero Oklahoma players (a
real, checked outcome) gets an explicit empty-string row instead, which
is different from being absent.
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


# Tried in era order (cheapest-first, not exhaustive-first) since a
# season's real template only ever matches one of these -- trying the
# right one first halves the average request count per year. The
# boundary years (1978, 2006) are real Wikipedia/NCAA naming changes
# (Division I-A introduced 1978; renamed Division I FBS in 2006), not
# guesses, but a season right at either boundary might still be filed
# under the neighboring era's title on Wikipedia's own naming, so every
# pattern is still tried, just reordered.
TEMPLATE_TITLE_PATTERNS_BY_ERA = {
    "fbs": "Template:{year} NCAA Division I FBS College Football Consensus All-Americans",
    "ia": "Template:{year} NCAA Division I-A College Football Consensus All-Americans",
    "plain": "Template:{year} College Football Consensus All-Americans",
}


def template_title_order(year: int) -> list[str]:
    if year >= 2006:
        order = ["fbs", "ia", "plain"]
    elif year >= 1978:
        order = ["ia", "plain", "fbs"]
    else:
        order = ["plain", "ia", "fbs"]
    return [TEMPLATE_TITLE_PATTERNS_BY_ERA[k].format(year=year) for k in order]


def fetch_consensus_template(session: requests.Session, year: int) -> Optional[str]:
    for title in template_title_order(year):
        text = fetch_wikitext(session, title)
        if text:
            return text
    return None


LIST_PARAM_RE = re.compile(r"^list\d+$")


def parse_consensus_template(text: str) -> list[dict]:
    """
    Parses the {{Team roster navbox ...}} template call itself, walking
    every |list1=/|list2=/... param (one per position group, e.g. Offense/
    Defense/Special teams) and, within each, every "* POS [[Player]]" or
    "* POS [[Target|Display]]" line. Returns [{"position","target",
    "display"}, ...] for every player in the season's real consensus
    roster -- school affiliation isn't in this template at all, so the
    caller cross-references extract_all_named_players() for that.
    """
    wikicode = mwph.parse(text)
    templates = wikicode.filter_templates(matches=lambda t: t.name.strip().lower() == "team roster navbox")
    if not templates:
        return []
    players: list[dict] = []
    for param in templates[0].params:
        if not LIST_PARAM_RE.match(param.name.strip()):
            continue
        for line in str(param.value).splitlines():
            line = line.strip()
            if not line.startswith("*"):
                continue
            content = line[1:].strip()
            wikilinks = mwph.parse(content).filter_wikilinks()
            if not wikilinks:
                continue
            link = wikilinks[0]
            target = str(link.title).strip()
            display = str(link.text).strip() if link.text else target
            # clean(), not a raw substring: a handful of lines carry a
            # stray <br/> tag ahead of the position abbreviation (confirmed
            # live, 1976: "* <br/>OT [[Mike Vaughan]]" -- an editor artifact,
            # not meaningful markup) that a plain slice leaves in literally.
            position = clean(content[: content.find("[[")]).strip()
            players.append({"position": position, "target": target, "display": display})
    return players


NAME_NORMALIZE_RE = re.compile(r"[.\s]+")


def normalize_name(name: str) -> str:
    """
    Strips periods and collapses whitespace so "E.J. Henderson" (as one
    Wikipedia page links it) and "E. J. Henderson" (as another links the
    same person) compare equal -- confirmed live on 2001's page, where the
    template and the main article's body use the two different spacings
    for the same non-Oklahoma player. Real editorial inconsistency, not a
    parsing bug in either direction.
    """
    return NAME_NORMALIZE_RE.sub(" ", name).strip().lower()


def extract_all_named_players(text: str) -> list[dict]:
    """
    Every player named anywhere in the main article's roster area -- any
    selector, any school, regardless of bold/consensus status -- as
    [{"target","display","school"}, ...], used only to look up a school
    for a name the consensus template already told us is a real pick.
    Pulls from both a wikitable (any table with Name/School columns,
    reusing extract_school_players()'s rowspan/{{sortname}} handling) and
    bulleted "* [[Name]], School <small>(...)</small>" lines.

    Table entries are returned FIRST and the caller must prefer the first
    match for a given key: confirmed live on 1985, whose page has a
    wikitable with a clean "Oklahoma" school cell for Brian Bosworth and
    Tony Casillas AND a separate, unrelated "notable individual award
    winners" trivia bullet ("Brian Bosworth, Oklahoma linebacker who won
    the 1985 Dick Butkus Award;") that happens to match the same
    "[[Name]], text-with-a-comma" shape -- a naive dict-comprehension
    build (last-value-wins) let that messier text silently overwrite the
    clean table school, turning a real, already-correctly-resolved 2-
    player season into a false zero. Scanning is bounded to the roster
    area (first "==Offense==" through "See also"/"References"/"External
    links") for the same reason -- the whole page is not a safe scope to
    search for "Name, school-shaped text."
    """
    results: list[dict] = []
    wikicode = mwph.parse(text)
    tables = wikicode.filter_tags(matches=lambda n: n.tag == "table")
    for table in tables:
        header_cells = table.contents.filter_tags(matches=lambda n: n.tag == "th")
        headers = [clean(str(c.contents)).strip().lower() for c in header_cells]
        name_i = next((i for i, h in enumerate(headers) if h == "name"), None)
        school_i = next((i for i, h in enumerate(headers) if h in ("school", "university")), None)
        if name_i is None or school_i is None:
            continue
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
            name, _unanimous = extract_name(full_row[name_i])
            if not name:
                continue
            # extract_name() only returns display text; recover a wikilink
            # target too, when the cell has one, for the primary match key.
            wikilinks = full_row[name_i].contents.filter_wikilinks()
            target = str(wikilinks[0].title).strip() if wikilinks else None
            school = clean(str(full_row[school_i].contents)).strip()
            results.append({"target": target, "display": name, "school": school})

    offense_start = text.find("\n==Offense==")
    scan_text = text
    if offense_start != -1:
        end_candidates = [
            i for i in (text.find("\n==See also=="), text.find("\n==References=="), text.find("\n==External links=="))
            if i != -1
        ]
        end = min(end_candidates) if end_candidates else len(text)
        scan_text = text[offense_start:end]
    for line in scan_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("*"):
            continue
        content = stripped[1:].strip()
        before_small = re.split(r"<small>", content, maxsplit=1)[0]
        wikilinks = mwph.parse(before_small).filter_wikilinks()
        cleaned = clean(before_small).strip()
        if "," not in cleaned:
            continue
        name_part, school_part = cleaned.split(",", 1)
        name_part, school_part = name_part.strip(), school_part.strip()
        if not name_part or not school_part:
            continue
        target = str(wikilinks[0].title).strip() if wikilinks else None
        results.append({"target": target, "display": name_part, "school": school_part})
    return results


BIO_OKLAHOMA_RE = re.compile(r"\boklahoma\b", re.IGNORECASE)


def bio_mentions_oklahoma(session: requests.Session, page_title: str) -> bool:
    """
    Last-resort check for a consensus-template entry that couldn't be
    matched to a school via the main article's own body at all: fetch that
    player's own Wikipedia bio page and check whether "Oklahoma" appears
    in it. Only called for the rare unmatched case (one hit across this
    script's ~13-season hand-validation pass, a Maryland linebacker whose
    body-text wikilink used different name spacing than the template) --
    cheap enough to afford a real check instead of assuming "not OU."
    A true positive here still isn't auto-included (school beyond "does
    Oklahoma appear on the page" isn't confirmed), just flagged as a real
    gap for manual review rather than silently dropped or guessed in.
    """
    text = fetch_wikitext(session, page_title)
    return bool(text and BIO_OKLAHOMA_RE.search(text[:4000]))


def oklahoma_consensus_all_americans(
    session: requests.Session, year: int
) -> tuple[Optional[list[dict]], str, list[str]]:
    """
    Returns (players, status, possible_misses). players is None only when
    the year is genuinely unresolved under both the template and fallback
    methods -- an empty list is a real, checked "zero OU consensus All-
    Americans that season," not a failure to find data. status is one of:
    "template", "table", "bulleted", "no_page", "no_consensus_signal_found",
    "no_players_parsed". possible_misses lists any template entry that
    couldn't be matched to a school AND whose own bio page mentions
    Oklahoma -- worth a manual look, even though the season's own
    `players` result is otherwise fully resolved.
    """
    template_text = fetch_consensus_template(session, year)
    if template_text:
        template_players = parse_consensus_template(template_text)
        main_text = fetch_all_america_page(session, year)
        if not main_text:
            return None, "template_found_no_main_page", []

        body_players = extract_all_named_players(main_text)
        by_target: dict[str, dict] = {}
        by_display: dict[str, dict] = {}
        for p in body_players:
            if p["target"]:
                key = normalize_name(p["target"])
                by_target.setdefault(key, p)
            if p["display"]:
                key = normalize_name(p["display"])
                by_display.setdefault(key, p)

        oklahoma: list[dict] = []
        possible_misses: list[str] = []
        for tp in template_players:
            body = by_target.get(normalize_name(tp["target"])) or by_display.get(normalize_name(tp["display"]))
            if body is None:
                if bio_mentions_oklahoma(session, tp["target"]):
                    possible_misses.append(f"{tp['display']} ({tp['position']})")
                time.sleep(0.5)  # the extra bio fetch above counts against etiquette too
                continue
            if normalize_school(body["school"]) == "Oklahoma":
                oklahoma.append({"name": tp["display"], "position": tp["position"]})
        return oklahoma, "template", possible_misses

    # No template resolved for this year at all -- fall back to the
    # original body-only detection (see module docstring's FALLBACK
    # METHOD). Not observed to be needed across the full 1895-2025 range
    # in practice, but never assumed away.
    text = fetch_all_america_page(session, year)
    if not text:
        return None, "no_page", []

    section = find_consensus_section(text)
    if section:
        players = extract_school_players(section)
        oklahoma = [p for p in players if normalize_school(p["school"]) == "Oklahoma"]
        return oklahoma, "table", []

    if not (BOLD_LEGEND_RE.search(text) or CONSENSUS_MARKER_RE.search(text)):
        return None, "no_consensus_signal_found", []
    all_players = extract_bulleted_all_americans(text)
    if not all_players:
        return None, "no_players_parsed", []
    oklahoma = [p for p in all_players if p["consensus"] and normalize_school(p["school"]) == "Oklahoma"]
    return oklahoma, "bulleted", []


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
    possible_miss_lines: list[str] = []
    method_counts: dict[str, int] = {}
    STATUS_REASON = {
        "no_page": "no All-America team page found for this year under any known title pattern",
        "template_found_no_main_page": "consensus template resolved, but the main All-America team page "
        "(needed for school affiliation) didn't -- left unresolved rather than guessed",
        "no_consensus_signal_found": "no consensus template found for this year, and its main page has no "
        "Consensus All-Americans table/heading, no documented bold-means-consensus convention, and no "
        "explicit CONSENSUS/UNANIMOUS marker -- format not recognized, left unresolved rather than guessed",
        "no_players_parsed": "no consensus template found for this year; its main page documents a consensus "
        "signal but no player rows parsed from its bulleted sections -- an unrecognized sub-structure, left "
        "unresolved rather than guessed",
    }

    years = list(range(args.start, args.end + 1))
    for i, year in enumerate(years):
        print(f"[{i + 1}/{len(years)}] pulling {year} All-America team page...")
        try:
            players, status, possible_misses = oklahoma_consensus_all_americans(session, year)
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
            method_counts[status] = method_counts.get(status, 0) + 1
            rows.append(
                {
                    "year": year,
                    "consensus_all_americans": format_players(players),
                    "consensus_all_american_count": len(players),
                }
            )
            if possible_misses:
                possible_miss_lines.append(
                    f"- **{year}**: consensus template lists {', '.join(possible_misses)}, whose bio page(s) "
                    "mention Oklahoma but couldn't be matched to a school in the main article body -- "
                    "verify by hand before counting; not included in this season's count above."
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
        f"{len(gaps)} left unresolved below, never guessed. Resolved via: "
        + ", ".join(f"{v} {k}" for k, v in sorted(method_counts.items())) + ".",
        "",
    ]
    lines.extend(gaps)
    if possible_miss_lines:
        lines.append("")
        lines.append("## Possible misses worth a manual look")
        lines.append(
            "These seasons ARE resolved (their count above is real) -- but the consensus template also "
            "named a player this pull couldn't tie to a school, and that player's own bio page mentions "
            "Oklahoma. Almost certainly not actually OU (this check is deliberately loose), but not silently "
            "assumed away either."
        )
        lines.extend(possible_miss_lines)
    gap_report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nWrote {len(rows)} seasons -> {out_csv}")
    print(f"Gap report -> {gap_report}")


if __name__ == "__main__":
    main()
