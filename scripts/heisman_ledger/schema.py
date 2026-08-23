"""
Shared row schema for the Heisman Park Ledger data pipeline. One place so
pull_wikipedia.py, pull_cfbd.py, and merge_dataset.py agree on field names
and never drift into three slightly different CSV shapes.
"""
from __future__ import annotations

from dataclasses import dataclass, field, fields
from typing import Optional

# Matches data/heisman-ledger/ou_seasons_verified.csv exactly — the merge
# step depends on this column order lining up with the verified file.
SEASON_FIELDS = [
    "year",
    "head_coach",
    "conference",
    "final_record",
    "final_ap_rank",
    "national_title_claim",
    "points_for",
    "points_against",
    "beat_texas",
    "beat_osu",
    "heisman_winner",
    "notable_all_americans",
    "data_tier",
    "source_notes",
]

GAME_FIELDS = [
    "year",
    "game_order",
    "date",
    "opponent",
    "site_text",
    "home_away_guess",  # "home" | "away" | "neutral" | "unknown" — heuristic, never asserted as fact
    "result",  # "W" | "L" | "T" | ""
    "team_score",
    "opp_score",
    "notes",
]


@dataclass
class SeasonRow:
    year: int
    head_coach: Optional[str] = None
    conference: Optional[str] = None
    final_record: Optional[str] = None
    final_ap_rank: Optional[str] = None
    national_title_claim: Optional[str] = None
    points_for: Optional[int] = None
    points_against: Optional[int] = None
    beat_texas: Optional[str] = None  # "TRUE" | "FALSE" | "SPLIT" | "N/A (not on schedule)"
    beat_osu: Optional[str] = None
    heisman_winner: Optional[str] = None
    notable_all_americans: Optional[str] = None
    data_tier: Optional[int] = None
    source_notes: str = ""
    # Not written to the season CSV — carried alongside for merge_dataset.py's
    # gap-report step so a season with e.g. a truncated schedule table still
    # surfaces the reason, not just a blank field.
    gaps: list[str] = field(default_factory=list)

    def to_row(self) -> dict:
        return {k: getattr(self, k) for k in SEASON_FIELDS}


@dataclass
class GameRow:
    year: int
    game_order: int
    date: Optional[str] = None
    opponent: Optional[str] = None
    site_text: Optional[str] = None
    home_away_guess: str = "unknown"
    result: Optional[str] = None
    team_score: Optional[int] = None
    opp_score: Optional[int] = None
    notes: str = ""

    def to_row(self) -> dict:
        return {k: getattr(self, k) for k in GAME_FIELDS}


def data_tier_for(year: int, season: SeasonRow) -> int:
    """
    Per the Cowork brief's efficiency waterfall:
      1 — ~2005-present, CFBD SP+/efficiency (assigned later, in merge_dataset.py,
          once the CFBD pull confirms the season actually has data)
      2 — ~1950s-2000s, yards/play (not obtainable from a Wikipedia season
          infobox in practice — reserved for a future manual/other-source pass)
      3 — pre-1950s / gap years, yards/game vs. national rank proxy — in
          practice, everything this Wikipedia-only pull can find a real
          record + PF/PA + conference for
      4 — earliest/thinnest seasons, points/game only — no conference
          affiliation, or no usable points data at all

    This is a per-season *rule*, not a hardcoded value: it looks at what the
    pull actually returned for this row, the same way the 27 verified rows
    were tiered by hand.
    """
    if year >= 2005:
        return 1
    has_points = season.points_for is not None and season.points_against is not None
    has_conference = bool(season.conference) and season.conference not in (
        None,
        "",
        "N/A (independent)",
    )
    if has_points and has_conference:
        return 3
    return 4
