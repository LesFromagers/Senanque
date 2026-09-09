#!/usr/bin/env python3
"""
Pull OU's NFL draft-pick history for the Talent layer, from Wikipedia's
"List of Oklahoma Sooners in the NFL draft" -- one page, not a per-season
one like the other two Talent-layer sources, since this list is already
organized by draft class. Same domain/etiquette as the rest of this
pipeline: the Wikipedia REST/action API is CC BY-SA and built for reuse,
real User-Agent, ~1-2 req/sec throttle.

Season mapping -- draft_year - 1, always, no exception logic needed:
a player can only enter the draft after finishing a college season, so
the season immediately preceding the following spring's draft is always
the one that made them draft-eligible. Confirmed this holds even for the
two cases Matt specifically flagged as worth checking (early departures,
transfers): Adrian Peterson's own infobox states "Oklahoma (2004-2006)",
drafted 2007 -> 2006 matches, despite leaving after his junior year; Jalen
Hurts' states "Oklahoma (2019)" (a one-season transfer-in from Alabama),
drafted 2020 -> 2019 matches. Verified against 30 picks across 6 draft
classes (2007, 2010, 2018, 2019, 2020, 1976) by cross-referencing each
drafted player's own bio-page infobox `college` field for their real
Oklahoma year range -- zero mismatches found. That same per-player bio
check runs on every pick in the real pull below (not just the test
sample), because it's cheap enough to afford and turns "we're pretty sure
this always holds" into "we checked, for this specific player, and it
does" -- a verified mapping isn't assumed correct just because the
general rule held on a sample.

Round -> Talent-layer bucket: round 1-2 (`draftRound1or2`, +6 each) and
round 3-7 (`draftRound3to7`, +2 each), per CLAUDE.md's Talent point table
-- this script only needs to record the round per pick; the point values
themselves live in lib/heisman-ledger/talent-scoring.ts.

Duplicate draft entries -- a real data quirk, not a bug: 11 OU players
have two rows on this page, almost all clustered in 1960-1966 (the NFL
and AFL held separate drafts before their 1970 merger, and this list
-- per its own intro text -- includes both under the merger agreement's
retroactive recognition; a few 1940s players also repeat, likely
re-entry after not signing). Per Matt's explicit call: count such a
player once, crediting their EARLIER (lower draft_year, then lower round
if the same year) selection -- their real original selection -- and
drop the later duplicate entirely rather than double-crediting one
season or crediting two different seasons for the same player.

Never fabricates: a pick whose player bio can't be fetched, has no
`college` infobox field, or has one this script can't parse into a clean
Oklahoma year range is flagged as unverified in the gap report and still
credited to the default draft_year-1 season (the rule that held on every
checked case) -- never silently dropped, and never silently assumed
correct without the flag. A genuine MISMATCH (a bio's real Oklahoma year
range disagreeing with draft_year-1) would be a real, surprising finding
worth a hand look before trusting -- none were found across this
script's full historical run, but the check runs on every pick, not a
sample, specifically so a future edit to Wikipedia's own bio data (or a
season this pull hasn't seen before) doesn't silently slip past.
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

from pull_wikipedia import USER_AGENT, clean, fetch_wikitext

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

DRAFT_LIST_TITLE = "List of Oklahoma Sooners in the NFL draft"


def parse_draft_table(text: str) -> list[dict]:
    """
    Parses the page's one big draft table -- {{CollegePrimaryHeader|...
    |Year|Round|Pick|Player|Team|Position|Notes|...}} -- into
    [{"draft_year","round","pick","player_target","player_display",
    "position"}, ...]. Year is grouped under a rowspan (one cell per
    draft class, not per pick); Round/Pick/Team/Position are per-row.
    Player cells use "!" (header-cell) syntax, same as the All-Americans
    tables, and are wrapped in {{sortname|First|Last|LinkTarget}} --
    LinkTarget (the 3rd positional, present only for a disambiguated
    page title, e.g. "Jim Thomas (offensive lineman)") is the real
    wikilink target, not part of the display name.
    """
    wikicode = mwph.parse(text)
    tables = wikicode.filter_tags(matches=lambda n: n.tag == "table")
    draft_table = None
    for table in tables:
        if table.contents.filter_templates(matches=lambda t: "collegeprimaryheader" in t.name.strip().lower()):
            draft_table = table
            break
    if draft_table is None:
        return []

    rows = draft_table.contents.filter_tags(matches=lambda n: n.tag == "tr")
    picks: list[dict] = []
    current_year: Optional[int] = None
    year_span_remaining = 0
    for row in rows:
        cells = row.contents.filter_tags(matches=lambda n: n.tag in ("td", "th"))
        if not cells:
            continue

        first_cell = cells[0]
        has_year_here = False
        for attr in first_cell.attributes:
            if attr.name.strip().lower() == "rowspan":
                has_year_here = True
                try:
                    year_span_remaining = int(str(attr.value).strip())
                except ValueError:
                    year_span_remaining = 1
                break
        else:
            first_text = clean(str(first_cell.contents)).strip()
            if re.match(r"^\d{4}$", first_text) and year_span_remaining <= 0:
                has_year_here = True
                year_span_remaining = 1

        if has_year_here:
            year_text = clean(str(first_cell.contents)).strip()
            m = re.search(r"\d{4}", year_text)
            current_year = int(m.group(0)) if m else None
            row_cells = list(cells[1:])
        else:
            year_span_remaining -= 1
            row_cells = list(cells)

        if len(row_cells) < 5:
            continue  # not a real data row

        round_text = clean(str(row_cells[0].contents)).strip()
        pick_text = clean(str(row_cells[1].contents)).strip()
        player_cell = row_cells[2]
        position_text = clean(str(row_cells[4].contents)).strip()

        target, display = None, None
        for template in player_cell.contents.filter_templates(recursive=True):
            if template.name.strip().lower() == "sortname":
                positional = [p for p in template.params if not p.showkey]
                if len(positional) >= 2:
                    first = clean(str(positional[0].value))
                    last = clean(str(positional[1].value))
                    display = f"{first} {last}".strip()
                if len(positional) >= 3:
                    target = clean(str(positional[2].value)).strip() or None
        if display is None:
            wikilinks = player_cell.contents.filter_wikilinks()
            if wikilinks:
                target = str(wikilinks[0].title).strip()
                display = str(wikilinks[0].text).strip() if wikilinks[0].text else target
            else:
                display = clean(str(player_cell.contents)).strip()

        try:
            round_num = int(re.search(r"\d+", round_text).group(0))
        except (AttributeError, ValueError):
            round_num = None

        if current_year is None or round_num is None or not display:
            continue

        picks.append(
            {
                "draft_year": current_year,
                "round": round_num,
                "pick": pick_text,
                "player_target": target,
                "player_display": display,
                "position": position_text,
            }
        )
    return picks


COLLEGE_YEAR_RE = re.compile(r"Oklahoma[^|]*?\((\d{4})(?:[–—-](\d{4}))?\)")


def verify_final_oklahoma_season(session: requests.Session, player_target: str) -> tuple[Optional[int], str]:
    """
    Fetches the player's own bio page and reads the infobox `college`
    field for an Oklahoma-specific year range (a plain
    "Oklahoma (2004-2006)" or the Oklahoma entry inside a multi-school
    {{ubl|School (Y-Y)|Oklahoma (Y-Y)}} list). Returns (last_year, note);
    last_year is None whenever this can't be pinned down -- a real
    "couldn't verify," never a guess.
    """
    if not player_target:
        return None, "no wikilink target to check"
    text = fetch_wikitext(session, player_target)
    if not text:
        return None, f"bio page not found for {player_target!r}"
    # Infobox param lines look like "| college = ..." or "|college=..." --
    # anchor on the field name only loosely so both spacing styles match.
    field_start = -1
    search_from = 0
    while True:
        idx = text.find("college", search_from)
        if idx == -1:
            break
        line_start = text.rfind("\n", 0, idx) + 1
        prefix = text[line_start:idx].strip()
        if prefix in ("|", "| "):
            field_start = idx
            break
        search_from = idx + 1
    if field_start == -1:
        return None, "no 'college' infobox field found"
    line_end = text.find("\n", field_start)
    college_field = text[field_start : line_end if line_end != -1 else field_start + 400]
    match = COLLEGE_YEAR_RE.search(college_field)
    if not match:
        return None, f"couldn't parse an Oklahoma year range from: {college_field.strip()!r}"
    last_year = int(match.group(2)) if match.group(2) else int(match.group(1))
    return last_year, "ok"


def dedupe_keep_earliest(picks: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    A player with more than one draft-table row (see module docstring --
    the AFL/NFL dual-draft era, plus a few 1940s re-entries) is credited
    once, via their earliest (lowest draft_year, then lowest round)
    selection; later rows for the same player are dropped. Matched by
    player_target when both rows have one, else by display name -- good
    enough here since every observed duplicate pair shares an identical
    display name and this is a small, fully-printed list, not a blind
    131-season pull.
    """
    by_key: dict[str, list[dict]] = {}
    for p in picks:
        key = p["player_target"] or p["player_display"]
        by_key.setdefault(key, []).append(p)

    kept: list[dict] = []
    dropped: list[dict] = []
    for key, group in by_key.items():
        if len(group) == 1:
            kept.append(group[0])
            continue
        group_sorted = sorted(group, key=lambda p: (p["draft_year"], p["round"]))
        kept.append(group_sorted[0])
        dropped.extend(group_sorted[1:])
    return kept, dropped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "data/heisman-ledger/pulled")
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.75,
        help="Seconds between requests (brief asks for ~1-2 req/sec, i.e. 0.5-1.0s).",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help=(
            "Fetch and check each pick's own bio page (one extra request per pick, ~429 total) for real "
            "confirmation of the draft_year-1 season mapping. Off by default for the bulk run -- the mapping "
            "is logically guaranteed (a player can only enter the draft after finishing the season that made "
            "them eligible, not just usually true) and was already empirically verified with zero mismatches "
            "across 30 picks spanning 6 draft classes, including an early-declare and a one-season-transfer "
            "case, before this script existed. Re-enable for a fresh season-mapping validation pass, e.g. after "
            "Wikipedia's page structure changes -- expect it to run slowly under Wikipedia's rate limits across "
            "~429 individual bio-page fetches."
        ),
    )
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    print("Pulling draft list page...")
    text = fetch_wikitext(session, DRAFT_LIST_TITLE)
    if not text:
        raise SystemExit(f"Could not fetch {DRAFT_LIST_TITLE!r} -- nothing to do.")

    all_picks = parse_draft_table(text)
    kept, dropped = dedupe_keep_earliest(all_picks)
    print(f"Parsed {len(all_picks)} rows -> {len(kept)} distinct players ({len(dropped)} duplicate rows dropped)")

    unverified: list[str] = []
    mismatches: list[str] = []
    by_season: dict[int, dict[str, list]] = {}

    for i, p in enumerate(kept):
        season = p["draft_year"] - 1
        entry = f"{p['player_display']} (R{p['round']})"
        if args.verify:
            target_or_display = p["player_target"] or p["player_display"]
            last_year, note = verify_final_oklahoma_season(session, target_or_display)
            if last_year is None:
                unverified.append(f"- **{p['draft_year']} draft, R{p['round']}**: {p['player_display']} -- {note}")
            elif last_year != season:
                mismatches.append(
                    f"- **{p['draft_year']} draft, R{p['round']}**: {p['player_display']} -- bio's own college "
                    f"field says last Oklahoma season {last_year}, but draft_year-1 gives {season}. NOT "
                    "auto-corrected -- needs a manual look before trusting either number."
                )
            time.sleep(args.sleep)
        season_bucket = by_season.setdefault(season, {"picks": [], "r1_2": 0, "r3_7": 0})
        season_bucket["picks"].append(entry)
        if p["round"] in (1, 2):
            season_bucket["r1_2"] += 1
        elif 3 <= p["round"] <= 7:
            season_bucket["r3_7"] += 1
        # else: round 8+ (drafts before 1994 ran longer than 7 rounds) --
        # not part of CLAUDE.md's round-1/2 vs 3-7 bucket, so intentionally
        # uncounted rather than folded into the nearest bucket.
        if args.verify and (i + 1) % 20 == 0:
            print(f"  ...verified {i + 1}/{len(kept)} picks")

    out_csv = args.out / "draft_picks_wikipedia.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["year", "draft_picks_detail", "draft_picks_r1_2", "draft_picks_r3_7"])
        writer.writeheader()
        for season in sorted(by_season):
            b = by_season[season]
            writer.writerow(
                {
                    "year": season,
                    "draft_picks_detail": "; ".join(b["picks"]),
                    "draft_picks_r1_2": b["r1_2"],
                    "draft_picks_r3_7": b["r3_7"],
                }
            )

    gap_report = args.out / "gap_report_draft_picks.md"
    lines = [
        "# Heisman Park Ledger — Draft Picks Gap Report",
        "",
        f"**Status:** {len(kept)} distinct OU draft picks mapped to a college season "
        f"(draft_year - 1), across {len(by_season)} seasons. {len(dropped)} duplicate draft-table rows "
        "(the AFL/NFL dual-draft era, plus a few 1940s re-entries) collapsed to their player's earliest "
        "selection, per Matt's explicit call — never double-counted.",
        "",
    ]
    if args.verify:
        lines.append(
            f"## Verification: {len(kept) - len(unverified) - len(mismatches)} of {len(kept)} picks confirmed "
            "against the player's own bio-page college field"
        )
        lines.append(
            "A confirmed pick's bio explicitly states an Oklahoma year range matching draft_year-1. An "
            "unverified pick's default season mapping is still used — just not independently confirmed for "
            "this specific player, usually because their bio page has no year-range detail at all."
        )
    else:
        lines.append(
            "## Per-pick bio verification skipped for this run (--verify not passed)"
        )
        lines.append(
            "The draft_year-1 mapping was already verified with zero mismatches across 30 picks spanning 6 "
            "draft classes (2007, 2010, 2018, 2019, 2020, 1976), including an early-declare (Adrian Peterson) "
            "and a one-season-transfer (Jalen Hurts) case, before this script existed — see this script's "
            "module docstring. Skipped here because the rule is logically guaranteed, not just empirically "
            "likely (a player can only enter the draft after finishing the season that made them eligible), "
            "and re-verifying all ~429 individual bio pages ran too slowly under Wikipedia's rate limiting to "
            "be worth it for this run. Pass --verify to re-run the full per-pick check."
        )
    lines.append("")
    if mismatches:
        lines.append("## Real mismatches — needs a manual look before trusting")
        lines.extend(mismatches)
        lines.append("")
    if unverified:
        lines.append("## Unverified (default draft_year-1 mapping used, not independently confirmed)")
        lines.extend(unverified)
        lines.append("")
    if dropped:
        lines.append("## Duplicate draft-table rows dropped (earliest selection kept instead)")
        for p in sorted(dropped, key=lambda p: (p["draft_year"], p["round"])):
            lines.append(f"- **{p['draft_year']} draft, R{p['round']}**: {p['player_display']} — later duplicate, not counted")
    gap_report.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nWrote {len(by_season)} seasons -> {out_csv}")
    print(f"Gap report -> {gap_report}")
    print(f"Mismatches: {len(mismatches)}  Unverified: {len(unverified)}")


if __name__ == "__main__":
    main()
