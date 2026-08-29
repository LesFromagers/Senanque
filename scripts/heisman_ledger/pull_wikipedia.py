#!/usr/bin/env python3
"""
Bulk pull the ~103 OU football seasons not already covered by
data/heisman-ledger/ou_seasons_verified.csv, from Wikipedia only.

Wikipedia's action API is CC BY-SA licensed and explicitly built for reuse,
which is why it's the only site this script (or any automated pull in this
project) is allowed to hit — see the Cowork brief's hard constraints.
Sports-Reference and similar ToS-restricted sites are never touched here;
if one of those would help confirm a fact, this script logs a gap for a
human to check by hand instead of reaching for it.

Never fabricates: a field this pull can't find is left blank on the season
row (or simply absent from the game list) and logged to the gap report.
Table markup across 130 years of Wikipedia editing is too inconsistent for
regex to parse reliably — this is why parse_schedule_table() below uses
mwparserfromhell rather than the stubbed-out regex approach it replaces.
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

from schema import GAME_FIELDS, SEASON_FIELDS, GameRow, SeasonRow, data_tier_for

# This file lives at scripts/heisman_ledger/pull_wikipedia.py -- three
# parents up is the repo root. Anchoring the --verified/--out defaults
# here, rather than to a plain relative "../../data/...", means they
# resolve correctly no matter what directory this script is invoked from
# -- a relative default silently resolves against the process's cwd, not
# the script's own location, and writes outside the repo when run from
# somewhere other than scripts/heisman_ledger.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

API_URL = "https://en.wikipedia.org/w/api.php"

# Identifies the bot and gives Wikipedia a way to reach the project without
# putting a personal email address into a script that talks to an external
# service. Update the contact URL if the repo ever moves.
USER_AGENT = (
    "SenanqueHeismanLedgerBot/1.0 "
    "(https://senanque.dev; contact via github.com/LesFromagers/Senanque/issues) "
    "research pull for a portfolio data project, Wikipedia API only, throttled"
)

FIRST_SEASON = 1895

# Team-season articles almost universally follow "{year} Oklahoma Sooners
# football team"; a handful of very early years use "season" instead, and
# a few might not have a standalone article at all. Try each in order and
# log a gap (never guess a fourth pattern or fall back to another site) if
# none of them resolve to a real page.
TITLE_PATTERNS = [
    "{year} Oklahoma Sooners football team",
    "{year} Oklahoma Sooners football season",
]


def load_verified_years(verified_csv: Path) -> set[int]:
    with verified_csv.open(newline="", encoding="utf-8") as f:
        return {int(row["year"]) for row in csv.DictReader(f)}


MAX_RETRIES = 5


def fetch_wikitext(session: requests.Session, title: str) -> Optional[str]:
    """
    Returns the page's current wikitext, or None if the title doesn't
    resolve. Retries a 429/5xx with backoff (honoring a Retry-After header
    when the server sends one) rather than surfacing it as a fetch error —
    a full 131-season run confirmed this matters: a burst of testing calls
    against the live API before this run left the pull rate-limited on and
    off for most of its length, and every 429 that wasn't retried got
    mislabeled downstream as "no Wikipedia season article found" — a false
    gap, not a real one, for a season this source does have.
    """
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
        "redirects": 1,
        "titles": title,
    }
    for attempt in range(MAX_RETRIES):
        resp = session.get(API_URL, params=params, timeout=20)
        if resp.status_code == 429 or resp.status_code >= 500:
            if attempt == MAX_RETRIES - 1:
                resp.raise_for_status()
            retry_after = resp.headers.get("Retry-After")
            wait = float(retry_after) if retry_after else min(5 * (2**attempt), 60)
            time.sleep(wait)
            continue
        resp.raise_for_status()
        break
    data = resp.json()
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if "missing" in page:
            return None
        revisions = page.get("revisions")
        if revisions:
            return revisions[0]["slots"]["main"]["*"]
    return None


def clean(text: str) -> str:
    """Strips wiki markup down to plain text for a single cell/param value."""
    return mwph.parse(text).strip_code().strip()


def clean_multiline(text: str) -> list[str]:
    """
    Like clean(), but for an infobox field that packs multiple facts into
    one param separated by literal <br> tags (the 'champion' field below is
    the reason this exists: a title season's infobox lists "Consensus
    national champion<br>Big 12 champion<br>..." as one string). strip_code()
    on its own discards <br> without inserting anything in its place, which
    mashes the segments into one unreadable run-on -- this normalizes <br>
    to a newline first so each fact survives as its own list entry.
    """
    normalized = re.sub(r"<br\s*/?>", "\n", str(text))
    cleaned = mwph.parse(normalized).strip_code()
    return [seg.strip() for seg in cleaned.splitlines() if seg.strip()]


def find_infobox(wikicode: mwph.wikicode.Wikicode):
    """
    Every OU season article checked while building this pull (1896 through
    2020, old and new) uses the same standardized template regardless of
    era: {{Infobox college sports team season}} -- not the football-
    specific name this function originally looked for (that assumption was
    never checked against a live page; see this script's README note on
    the offline-fixture-only validation this was originally shipped with).
    Kept "football" as an alternate match too, in case a stray page still
    uses an older/different infobox template.
    """
    for template in wikicode.filter_templates():
        name = template.name.strip().lower()
        if "infobox" not in name:
            continue
        if "football" in name or "college sports team" in name:
            return template
    return None


def parse_infobox(wikicode: mwph.wikicode.Wikicode, season: SeasonRow) -> None:
    infobox = find_infobox(wikicode)
    if infobox is None:
        season.gaps.append("no infobox found on the page")
        return

    # Infobox param names vary in case/underscoring across 130 years of
    # editing (HeadCoach vs head_coach vs headcoach) — index by lowercased,
    # underscore-stripped name rather than trusting one exact spelling.
    by_key = {
        param.name.strip().lower().replace("_", ""): param.value
        for param in infobox.params
    }

    def get(*candidates: str) -> Optional[str]:
        for candidate in candidates:
            value = by_key.get(candidate.replace("_", ""))
            if value is not None:
                cleaned = clean(str(value))
                if cleaned:
                    return cleaned
        return None

    season.head_coach = get("headcoach", "head_coach", "coach", "hccoach")
    season.conference = get("conference", "shortconference")
    record = get("record")
    if record:
        # Normalize "10-1-1" / "10–1–1" / "10 - 1 - 1" to a single dash form.
        season.final_record = re.sub(r"\s*[-–—]\s*", "-", record)
    season.final_ap_rank = get("apfinalrank", "ap_rank", "rank", "apfinal")

    # The real infobox packs every title claim into one 'champion' field —
    # e.g. "Consensus national champion<br>Big 12 champion<br>Big 12 South
    # Division champion" for a title season — rather than a dedicated
    # national-title param. Split it (see clean_multiline()) and keep only
    # the segment(s) that actually claim a *national* title for
    # national_title_claim; the rest (conference/division titles) still
    # matter to the Accomplishment layer's conference-champion heuristic,
    # so they're preserved in source_notes rather than dropped.
    champion_raw = by_key.get("champion")
    note_parts: list[str] = []
    if champion_raw is not None:
        segments = clean_multiline(str(champion_raw))
        national_segments = [s for s in segments if "national champion" in s.lower()]
        other_segments = [s for s in segments if s not in national_segments]
        if national_segments:
            season.national_title_claim = "; ".join(national_segments)
        if other_segments:
            note_parts.append(f"infobox 'champion' field also lists: {'; '.join(other_segments)}")

    bowl = get("bowl")
    bowl_result_raw = by_key.get("bowlresult")
    if bowl_result_raw is not None:
        bowl_result = " ".join(clean_multiline(str(bowl_result_raw)))
        if bowl_result:
            note_parts.append(f"bowl result: {bowl_result}" + (f" ({bowl})" if bowl else ""))
    elif bowl:
        note_parts.append(f"bowl: {bowl}")

    if note_parts:
        note = "; ".join(note_parts)
        season.source_notes = f"{season.source_notes} {note}".strip() if season.source_notes else note

    # Points for/against are rarely a direct infobox param on CFB season
    # pages — usually only recoverable by summing the schedule table, which
    # parse_schedule_table() below does. Left None here on purpose.

    if not season.head_coach:
        season.gaps.append("head coach not found in infobox")
    if not season.conference:
        season.gaps.append("conference not found in infobox")
    if not season.final_record:
        season.gaps.append("final record not found in infobox")


SCHEDULE_HEADER_HINTS = {"date", "opponent", "result", "site", "rank"}


def _row_cells(row_tag) -> list[str]:
    cells = row_tag.contents.filter_tags(matches=lambda n: n.tag in ("td", "th"))
    return [clean(str(cell.contents)) for cell in cells]


def _looks_like_schedule_table(header_cells: list[str]) -> bool:
    lowered = {c.strip().lower() for c in header_cells}
    return len(lowered & SCHEDULE_HEADER_HINTS) >= 2


RESULT_SCORE_RE = re.compile(
    r"^(?P<result>[WLT])\s*[,\s]*\s*(?P<team>\d+)\s*[-–—]\s*(?P<opp>\d+)",
    re.IGNORECASE,
)


def _parse_result_cell(text: str) -> tuple[Optional[str], Optional[int], Optional[int]]:
    """For a raw-wikitable schedule with one combined result cell, e.g. 'W 28-11'."""
    match = RESULT_SCORE_RE.match(text.strip())
    if not match:
        return None, None, None
    return match.group("result").upper(), int(match.group("team")), int(match.group("opp"))


SCORE_RE = re.compile(r"(\d+)\s*[-–—]\s*(\d+)")


def _parse_wl_score(w_l: str, score: str) -> tuple[Optional[str], Optional[int], Optional[int]]:
    """
    For {{CFB schedule entry}}, which — unlike the raw-wikitable format
    above — keeps the outcome and the score as two separate params ('w/l':
    'w'/'l'/'t', 'score': '34–0') rather than one combined cell.
    """
    result = w_l.strip().upper()[:1] if w_l.strip() else None
    if result not in ("W", "L", "T"):
        result = None
    match = SCORE_RE.search(score.strip())
    if not match:
        return result, None, None
    return result, int(match.group(1)), int(match.group(2))


def _guess_home_away(site_text: str, opponent_text: str = "") -> str:
    """
    Wikipedia schedule tables typically mark an away game with an "at "
    prefix on the *opponent* cell ("at Utah State"), not the site cell —
    the site cell just names the city. Neutral-site games (bowls) are
    usually identifiable by the site naming a stadium/bowl unconnected to
    either team's home city. Best-effort only: home_away_guess is exactly
    that, a guess, never asserted as a verified fact downstream.
    """
    opp_lowered = opponent_text.lower().strip()
    if opp_lowered.startswith("at ") or opp_lowered.startswith("@"):
        return "away"
    site_lowered = site_text.lower()
    if "norman" in site_lowered or "owen field" in site_lowered or "gaylord family" in site_lowered or "memorial stadium" in site_lowered:
        return "home"
    if "neutral" in site_lowered or "bowl" in site_lowered:
        return "neutral"
    return "unknown"


def parse_schedule_table(
    wikicode: mwph.wikicode.Wikicode, year: int, season: SeasonRow
) -> list[GameRow]:
    """
    Finds the schedule wikitable and returns one GameRow per game. Handles
    both a plain wikitable (pipe syntax parses to <table>/<tr>/<td> Tag
    nodes under mwparserfromhell) and the {{CFB Schedule Entry}}-style
    template rows some season articles use instead, by falling back to
    template-param extraction when a table has no usable <tr> rows.

    Deliberately conservative: a row that doesn't parse cleanly into a
    result/score is kept with whatever fields did parse and a note, never
    dropped silently and never guessed into a full row.
    """
    games: list[GameRow] = []
    tables = wikicode.filter_tags(matches=lambda n: n.tag == "table")
    schedule_table = None
    header_cells: list[str] = []

    for table in tables:
        rows = table.contents.filter_tags(matches=lambda n: n.tag == "tr")
        if not rows:
            continue
        candidate_header = _row_cells(rows[0])
        if _looks_like_schedule_table(candidate_header):
            schedule_table = table
            header_cells = [c.strip().lower() for c in candidate_header]
            break

    if schedule_table is None:
        # Fall back to {{CFB Schedule Entry}}-style templates, used by some
        # articles instead of a raw wikitable.
        entries = [
            t
            for t in wikicode.filter_templates()
            if "schedule entry" in t.name.strip().lower()
        ]
        if not entries:
            season.gaps.append("no schedule table or schedule-entry templates found")
            return games
        for i, entry in enumerate(entries, start=1):
            def gp(name: str) -> Optional[str]:
                return clean(str(entry.get(name).value)) if entry.has(name) else None

            opponent = gp("opponent") or gp("opp")
            date = gp("date")
            # 'site_stadium'/'site_cityst' are the real {{CFB schedule entry}}
            # params (checked against live pages spanning 1896-2020) — 'site'/
            # 'location' kept as fallbacks in case an outlier page differs.
            site_text = gp("site_stadium") or gp("site_cityst") or gp("site") or gp("location") or ""
            # The real template keeps outcome ('w/l': w/l/t) and score
            # ('score': '34–0') as two separate params, not one combined
            # 'result' cell — gp("result") always returned None against every
            # live page checked, silently discarding every game's score.
            w_l = gp("w/l") or gp("wl") or ""
            score = gp("score") or ""
            result, team_score, opp_score = _parse_wl_score(w_l, score)
            if result is None and team_score is None:
                # Fall back to the older combined-cell format on the off
                # chance a page still uses it under one of these param names.
                result, team_score, opp_score = _parse_result_cell(gp("result") or "")
            games.append(
                GameRow(
                    year=year,
                    game_order=i,
                    date=date,
                    opponent=opponent,
                    site_text=site_text or None,
                    home_away_guess=_guess_home_away(site_text or "", opponent or ""),
                    result=result,
                    team_score=team_score,
                    opp_score=opp_score,
                    notes="" if result else f"result/score did not parse from schedule-entry template (w/l={w_l!r}, score={score!r})",
                )
            )
        return games

    col_index = {name: i for i, name in enumerate(header_cells)}
    date_i = col_index.get("date")
    opp_i = col_index.get("opponent") or col_index.get("opponent#")
    site_i = col_index.get("site") or col_index.get("site/stadium") or col_index.get("location")
    result_i = col_index.get("result")

    rows = schedule_table.contents.filter_tags(matches=lambda n: n.tag == "tr")[1:]
    order = 0
    for row in rows:
        cells = _row_cells(row)
        if not cells or _looks_like_schedule_table(cells):
            continue  # a repeated header row (some tables repeat it mid-season)
        if all(not c.strip() for c in cells):
            continue

        def cell(i: Optional[int]) -> Optional[str]:
            if i is None or i >= len(cells):
                return None
            return cells[i].strip() or None

        opponent = cell(opp_i)
        if not opponent:
            continue  # a subtotal/spacer row, not a game
        order += 1

        result_text = cell(result_i) or ""
        result, team_score, opp_score = _parse_result_cell(result_text)
        site_text = cell(site_i) or ""

        games.append(
            GameRow(
                year=year,
                game_order=order,
                date=cell(date_i),
                opponent=opponent,
                site_text=site_text or None,
                home_away_guess=_guess_home_away(site_text, opponent),
                result=result,
                team_score=team_score,
                opp_score=opp_score,
                notes="" if result else f"result/score did not parse from cell: {result_text!r}",
            )
        )

    if not games:
        season.gaps.append("schedule table found but no game rows parsed from it")

    return games


def compute_points_from_games(games: list[GameRow], season: SeasonRow) -> None:
    scored = [g for g in games if g.team_score is not None and g.opp_score is not None]
    if not scored:
        season.gaps.append(
            f"points_for/points_against not computable: {len(games) - len(scored)} "
            f"of {len(games)} games missing a parsed score"
        )
        return
    if len(scored) < len(games):
        season.gaps.append(
            f"points_for/points_against computed from only {len(scored)} of "
            f"{len(games)} games — {len(games) - len(scored)} missing a score"
        )
    season.points_for = sum(g.team_score for g in scored)
    season.points_against = sum(g.opp_score for g in scored)


RANK_PREFIX_RE = re.compile(r"^(?:no\.?\s*\d+|#\d+)\s+", re.IGNORECASE)


def _opponent_matches(opponent: str, exact_name: str) -> bool:
    """
    True only if `opponent` refers to `exact_name` and nothing else — a
    plain substring check (the original approach here) false-positives
    "Texas Tech" and "Texas A&M" as matches for "Texas" (confirmed against
    a real page: 2013's opponents include both "Texas" and "Texas Tech",
    which made the old substring check report a Texas-rivalry SPLIT for a
    season OU actually just lost to Texas outright). Wikipedia sometimes
    prefixes a ranked opponent's name ("No. 19 Texas", confirmed on OU's
    2018 page) — that prefix is stripped before comparing, but nothing
    after the name is, so "Texas Tech" still correctly fails to match.
    """
    stripped = RANK_PREFIX_RE.sub("", opponent.strip())
    return stripped.strip().lower() == exact_name.lower()


def beat_flag(games: list[GameRow], exact_opponent_name: str) -> str:
    matches = [g for g in games if g.opponent and _opponent_matches(g.opponent, exact_opponent_name)]
    if not matches:
        return "N/A (not on schedule)"
    results = {g.result for g in matches if g.result}
    if "W" in results and "L" in results:
        return "SPLIT"
    if "W" in results:
        return "TRUE"
    if "L" in results or "T" in results:
        return "FALSE"
    return "N/A (not on schedule)"  # matched by name but no parsed result


def parse_awards(wikicode: mwph.wikicode.Wikicode, season: SeasonRow) -> None:
    text = str(wikicode)
    if re.search(r"heisman trophy", text, re.IGNORECASE) and not re.search(
        r"did not win|no oklahoma player won", text, re.IGNORECASE
    ):
        season.gaps.append(
            "page mentions the Heisman Trophy — confirm manually whether an "
            "OU player won or was a finalist before filling heisman_winner"
        )
    if re.search(r"all-american", text, re.IGNORECASE):
        season.gaps.append(
            "page mentions All-Americans — names not auto-extracted "
            "(too unreliable from prose); review manually"
        )


def pull_season(session: requests.Session, year: int) -> SeasonRow:
    season = SeasonRow(year=year)
    wikitext = None
    for pattern in TITLE_PATTERNS:
        title = pattern.format(year=year)
        try:
            wikitext = fetch_wikitext(session, title)
        except requests.RequestException as exc:
            season.gaps.append(f"fetch error for {title!r}: {exc}")
            continue
        if wikitext:
            season.source_notes = f"Wikipedia: {title}"
            break

    if not wikitext:
        season.gaps.append(
            f"no Wikipedia season article found under any of {TITLE_PATTERNS}"
        )
        season.data_tier = data_tier_for(year, season)
        return season

    wikicode = mwph.parse(wikitext)
    parse_infobox(wikicode, season)
    games = parse_schedule_table(wikicode, year, season)
    compute_points_from_games(games, season)
    season.beat_texas = beat_flag(games, "Texas")
    season.beat_osu = beat_flag(games, "Oklahoma State")
    parse_awards(wikicode, season)
    season.data_tier = data_tier_for(year, season)
    season._games = games  # type: ignore[attr-defined]  (picked up by caller, not part of the CSV schema)
    return season


def write_gap_report(seasons: list[SeasonRow], out_path: Path) -> None:
    gapped = [s for s in seasons if s.gaps]
    lines = [
        "# Heisman Park Ledger — Gap Report (bulk Wikipedia pull)",
        "",
        f"**Status:** {len(seasons) - len(gapped)} of {len(seasons)} seasons pulled clean; "
        f"{len(gapped)} flagged below. Same pattern as the hand-verified batch's gap "
        "report — nothing here was invented, every blank is a real gap in what the "
        "Wikipedia page returned.",
        "",
    ]
    for s in sorted(gapped, key=lambda s: s.year):
        lines.append(f"## {s.year}")
        for gap in s.gaps:
            lines.append(f"- {gap}")
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--verified",
        type=Path,
        default=REPO_ROOT / "data/heisman-ledger/ou_seasons_verified.csv",
    )
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "data/heisman-ledger/pulled")
    parser.add_argument("--start", type=int, default=FIRST_SEASON)
    parser.add_argument("--end", type=int, default=2025)
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.75,
        help="Seconds between requests (brief asks for ~1-2 req/sec, i.e. 0.5-1.0s).",
    )
    parser.add_argument(
        "--include-verified",
        action="store_true",
        help=(
            "Also pull years already in --verified, instead of skipping them. Used to "
            "fill gaps in the 27 hand-verified rows' supplementary fields (offense/"
            "defense info the verified CSV doesn't carry, e.g.) -- safe to do at any "
            "time, since merge_dataset.py's verified-wins rule means a Wikipedia value "
            "can never overwrite a verified one, only fill a blank."
        ),
    )
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    verified_years = load_verified_years(args.verified)
    years_to_pull = [
        y for y in range(args.start, args.end + 1) if args.include_verified or y not in verified_years
    ]

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    seasons: list[SeasonRow] = []
    all_games: list[GameRow] = []
    for i, year in enumerate(years_to_pull):
        print(f"[{i + 1}/{len(years_to_pull)}] pulling {year}...")
        try:
            season = pull_season(session, year)
        except Exception as exc:  # noqa: BLE001 -- a 130-year batch pull; one page's unexpected
            # markup must not crash the run and lose every other season already pulled.
            # fetch-level failures are already caught per-title inside pull_season() --
            # this only catches a genuine parsing surprise downstream of a successful fetch.
            print(f"  ERROR parsing {year}: {exc!r}")
            season = SeasonRow(year=year)
            season.gaps.append(f"unhandled parser error: {exc!r} — needs a manual look, not silently dropped")
            season.data_tier = 4
        seasons.append(season)
        all_games.extend(getattr(season, "_games", []))
        time.sleep(args.sleep)

    seasons_csv = args.out / "seasons_wikipedia.csv"
    with seasons_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SEASON_FIELDS)
        writer.writeheader()
        for s in seasons:
            writer.writerow(s.to_row())

    games_csv = args.out / "games_wikipedia.csv"
    with games_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=GAME_FIELDS)
        writer.writeheader()
        for g in all_games:
            writer.writerow(g.to_row())

    write_gap_report(seasons, args.out / "gap_report_bulk.md")

    print(f"\nWrote {len(seasons)} seasons -> {seasons_csv}")
    print(f"Wrote {len(all_games)} games -> {games_csv}")
    print(f"Gap report -> {args.out / 'gap_report_bulk.md'}")


if __name__ == "__main__":
    main()
