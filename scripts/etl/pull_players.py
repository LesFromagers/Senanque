"""Pull season aggregates from /players for one league + season (paginated).

Resumable: pages already in the raw cache cost nothing, and progress is
tracked per league + season + page. Stops cleanly at the daily cap.

  python scripts/etl/pull_players.py --league 39 --season 2024
  python scripts/etl/pull_players.py --league 39 --season 2024 --max-pages 2   # small trial
  python scripts/etl/pull_players.py --all-config-seasons --league 39
"""
from __future__ import annotations

import argparse
import sys

from api_client import ApiFootball, ApiPlanError, CapReached
from common import load_config
from store import make_state


def pull(api: ApiFootball, state, league: int, season: int, max_pages: int | None) -> bool:
    """Return True if the league-season is fully fetched."""
    progress = state.get_progress(league, season)
    page, total = 1, None
    while True:
        if max_pages is not None and page > max_pages:
            print(f"  --max-pages {max_pages} reached; stopping early.")
            return False
        try:
            body, cached = api.players_page(league, season, page)
        except ApiPlanError as e:
            state.set_progress(league, season, page, "error", note=str(e)[:500])
            print(f"  season {season} not available on this plan: {e}")
            return False
        total = body.get("paging", {}).get("total") or 1
        if progress.get(page) not in ("fetched", "loaded"):
            state.set_progress(league, season, page, "fetched", total_pages=total)
        print(f"  league {league} season {season} page {page}/{total} {'(cache)' if cached else '(API)'}")
        if page >= total:
            return True
        page += 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--league", type=int, default=39, help="Default: Premier League (39)")
    ap.add_argument("--season", type=int)
    ap.add_argument("--all-config-seasons", action="store_true", help="Use `seasons` from etl.config.json")
    ap.add_argument("--max-pages", type=int)
    ap.add_argument("--local-state", action="store_true")
    args = ap.parse_args()

    cfg = load_config()
    if args.league not in cfg["leagues"]:
        sys.exit(f"League {args.league} is not in etl.config.json.")
    seasons = cfg["seasons"] if args.all_config_seasons else ([args.season] if args.season else [])
    if not seasons:
        sys.exit("Give --season N, or fill `seasons` in etl.config.json and use --all-config-seasons.")

    state = make_state(args.local_state)
    api = ApiFootball(state, cfg["daily_request_cap"], cfg["min_seconds_between_requests"])
    try:
        for season in seasons:
            print(f"{cfg['leagues'][args.league]} {season}:")
            pull(api, state, args.league, season, args.max_pages)
    except CapReached as e:
        print(f"\nSTOPPED: {e} Re-run the same command tomorrow (UTC) — cached pages are free and progress is saved.")
    print(f"\nrequests spent this run: {api.spent_this_run}")


if __name__ == "__main__":
    main()
