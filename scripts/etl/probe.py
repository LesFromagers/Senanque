"""Tiny test pull: page 1 of /players for one league, per candidate season.

Costs ONE request per season tested (cache hits are free). Reports:
  - whether the season is reachable on your plan
  - page size and total pages  => real requests per league-season
  - the shape of a statistics[] block, so the migration's columns can be
    checked against a real response (key paths + types, not a data dump)
Paste the output back before planning any backfill.

  python3 scripts/etl/probe.py --season 2024
  python3 scripts/etl/probe.py --season 2022 --season 2023 --season 2024 --season 2025
"""
from __future__ import annotations

import argparse

from api_client import ApiFootball, ApiPlanError, CapReached
from common import load_config
from store import make_state


def flatten(obj, prefix=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from flatten(v, f"{prefix}{k}.")
    else:
        yield prefix[:-1], type(obj).__name__


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--league", type=int, default=39)
    ap.add_argument("--season", type=int, action="append", required=True)
    ap.add_argument("--local-state", action="store_true",
                    help="Keep ledger/progress in data/raw/ instead of Supabase (use before the migration is applied).")
    args = ap.parse_args()

    cfg = load_config()
    state = make_state(args.local_state)
    api = ApiFootball(state, cfg["daily_request_cap"], cfg["min_seconds_between_requests"])
    shown_shape = False

    for season in args.season:
        print(f"\n== league {args.league} season {season} ==")
        try:
            body, cached = api.players_page(args.league, season, 1)
        except ApiPlanError as e:
            print(f"NOT REACHABLE on this plan: {e}")
            continue
        except CapReached as e:
            print(f"STOPPED: {e}")
            break
        paging = body.get("paging", {})
        rows = body.get("response", [])
        print(f"reachable: yes{' (from cache)' if cached else ''}")
        print(f"page size (rows on page 1): {len(rows)}")
        print(f"total pages: {paging.get('total')}  => ~{paging.get('total')} requests per league-season")
        if rows and not shown_shape:
            shown_shape = True
            print("statistics[0] key paths/types (check against migration columns):")
            for path, typ in flatten(rows[0]["statistics"][0]):
                print(f"  {path}: {typ}")
            print("player block keys:", ", ".join(k for k, _ in flatten(rows[0]["player"])))
            print("passes.total vs passes.accuracy, first 3 players with both (to settle what 'accuracy' means):")
            n = 0
            for r in rows:
                p = r["statistics"][0].get("passes", {})
                if p.get("total") is not None and p.get("accuracy") is not None:
                    print(f"  total={p['total']} accuracy={p['accuracy']} minutes={r['statistics'][0]['games'].get('minutes')}")
                    n += 1
                    if n == 3:
                        break

    print(f"\nrequests spent this run: {api.spent_this_run} (cap {cfg['daily_request_cap']}/day)")


if __name__ == "__main__":
    main()
