#!/usr/bin/env python3
"""
Offline sanity check for pull_wikipedia.py's parsing logic, run against a
saved wikitext fixture instead of a live Wikipedia fetch. This is how the
parser was validated when it was written — this environment's network
policy didn't allow reaching en.wikipedia.org, so a real end-to-end pull
couldn't run here. Run this after any change to parse_infobox() or
parse_schedule_table() before trusting a live pull.
"""
from pathlib import Path

import mwparserfromhell as mwph

from pull_wikipedia import compute_points_from_games, parse_infobox, parse_schedule_table, beat_flag
from schema import SeasonRow

FIXTURE = Path(__file__).parent / "fixtures" / "sample_season.wikitext"


def run() -> None:
    wikitext = FIXTURE.read_text(encoding="utf-8")
    wikicode = mwph.parse(wikitext)

    season = SeasonRow(year=1974)
    parse_infobox(wikicode, season)

    assert season.head_coach == "Barry Switzer", season.head_coach
    assert season.conference == "Big Eight Conference", season.conference
    assert season.final_record == "11-0", season.final_record
    assert season.final_ap_rank == "1", season.final_ap_rank
    print("infobox parsing OK:", season.head_coach, season.conference, season.final_record)

    games = parse_schedule_table(wikicode, 1974, season)
    assert len(games) == 11, f"expected 11 games, got {len(games)}"
    assert games[0].opponent == "Baylor"
    assert games[0].result == "W"
    assert games[0].team_score == 28
    assert games[0].opp_score == 11
    assert games[0].home_away_guess == "home"
    assert games[1].opponent == "at Utah State"
    assert games[1].home_away_guess == "away"
    print(f"schedule parsing OK: {len(games)} games, first = {games[0]}")

    compute_points_from_games(games, season)
    assert season.points_for == sum(g.team_score for g in games)
    assert season.points_against == sum(g.opp_score for g in games)
    print(f"points_for={season.points_for} points_against={season.points_against}")

    assert beat_flag(games, "texas") == "TRUE"
    assert beat_flag(games, "oklahoma state") == "TRUE"
    assert beat_flag(games, "nebraska") == "TRUE"
    assert beat_flag(games, "notre dame") == "N/A (not on schedule)"
    print("beat_flag OK")

    assert season.gaps == [], f"unexpected gaps on a clean fixture: {season.gaps}"

    # Edge case: a page with no infobox and no schedule table should log
    # gaps and return cleanly, never raise or fabricate a value.
    empty = SeasonRow(year=1899)
    empty_wikicode = mwph.parse("Just some prose about a season, no templates or tables.")
    parse_infobox(empty_wikicode, empty)
    empty_games = parse_schedule_table(empty_wikicode, 1899, empty)
    assert empty.head_coach is None and empty.conference is None
    assert empty_games == []
    assert "no infobox found on the page" in empty.gaps
    assert "no schedule table or schedule-entry templates found" in empty.gaps
    print("empty-page edge case OK:", empty.gaps)

    print("\nAll offline parser checks passed.")


if __name__ == "__main__":
    run()
