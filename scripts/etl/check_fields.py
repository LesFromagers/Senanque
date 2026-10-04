"""Zero-request sanity check on the cached page(s) from probe/pull.

Settles two open questions from the first real response:
  1. passes.accuracy: if it is an AVERAGE accurate passes per appearance,
     accuracy * appearances / passes.total should land around 0.6-0.95 for
     nearly every player. If it is a percentage, accuracy itself will sit
     around 60-95 and the ratio above will be nonsense (often > 1).
  2. How often are counting stats null for players with real minutes?
     (API-Football appears to return null for "zero", e.g. goals.total.)

  python3 scripts/etl/check_fields.py --league 39 --season 2024
"""
from __future__ import annotations

import argparse
import json
from statistics import median

from api_client import ApiFootball

FIELDS = [("goals", "total"), ("goals", "assists"), ("shots", "total"), ("shots", "on"),
          ("passes", "total"), ("passes", "key"), ("passes", "accuracy"),
          ("tackles", "total"), ("tackles", "blocks"), ("tackles", "interceptions"),
          ("duels", "total"), ("duels", "won"), ("dribbles", "attempts"), ("dribbles", "success"),
          ("fouls", "drawn"), ("fouls", "committed"), ("cards", "yellow"), ("cards", "red")]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--league", type=int, default=39)
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--min-minutes", type=int, default=450)
    a = ap.parse_args()

    rows, page = [], 1
    while True:
        path = ApiFootball.cache_path("players", {"league": a.league, "season": a.season, "page": page})
        if not path.exists():
            break
        body = json.loads(path.read_text())
        for e in body["response"]:
            for st in e["statistics"]:
                if st["league"]["id"] == a.league:
                    rows.append(st)
        if page >= (body.get("paging", {}).get("total") or 1):
            break
        page += 1
    print(f"cached rows: {len(rows)} (pages 1-{page})")

    ratios, raw = [], []
    for st in rows:
        p, g = st.get("passes") or {}, st.get("games") or {}
        if p.get("total") and p.get("accuracy") is not None and g.get("appearences"):
            ratios.append(p["accuracy"] * g["appearences"] / p["total"])
            raw.append(p["accuracy"])
    if ratios:
        ratios.sort()
        print(f"\npasses.accuracy check over {len(ratios)} players:")
        print(f"  raw accuracy      median={median(raw):.0f}  min={min(raw)}  max={max(raw)}")
        print(f"  acc*apps/total    median={median(ratios):.2f}  p10={ratios[len(ratios)//10]:.2f}  p90={ratios[len(ratios)*9//10]:.2f}")
        print("  (ratio mostly 0.6-0.95 => accuracy is accurate passes PER APPEARANCE;"
              " ratio mostly > 1 and raw 60-95 => it is a percentage)")

    played = [s for s in rows if ((s.get("games") or {}).get("minutes") or 0) >= a.min_minutes]
    print(f"\nnull counts among {len(played)} rows with >= {a.min_minutes} minutes:")
    for blk, key in FIELDS:
        n = sum(1 for s in played if (s.get(blk) or {}).get(key) is None)
        print(f"  {blk}.{key}: {n} null ({100 * n / max(len(played), 1):.0f}%)")


if __name__ == "__main__":
    main()
