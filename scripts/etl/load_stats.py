"""Turn cached raw /players pages into Supabase rows. Makes ZERO API calls.

Idempotent: re-running upserts the same rows. Keeps domestic-league rows only
(league id in etl.config.json); cups and European competitions are dropped.

  python scripts/etl/load_stats.py --league 39 --season 2024 --dry-run   # parse only, no DB
  python scripts/etl/load_stats.py --league 39 --season 2024
"""
from __future__ import annotations

import argparse
import json
import sys

from api_client import ApiFootball
from common import load_config, season_label, to_int, to_num
from store import SupabaseRest, SupabaseState

SOURCE = "api_football"
CHUNK = 200


def chunks(seq, n=CHUNK):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def full_name(p: dict) -> str:
    first, last = (p.get("firstname") or "").strip(), (p.get("lastname") or "").strip()
    return f"{first} {last}".strip() if first and last else (p.get("name") or "").strip()


def stat_row(st: dict) -> dict:
    g, sh, go, pa = st.get("games") or {}, st.get("shots") or {}, st.get("goals") or {}, st.get("passes") or {}
    ta, du, dr = st.get("tackles") or {}, st.get("duels") or {}, st.get("dribbles") or {}
    fo, ca = st.get("fouls") or {}, st.get("cards") or {}
    return {
        "position": g.get("position"),
        "appearances": to_int(g.get("appearences")),  # sic: API spelling
        "starts": to_int(g.get("lineups")),
        "minutes": to_int(g.get("minutes")),
        "rating": to_num(g.get("rating")),
        "goals": to_int(go.get("total")), "assists": to_int(go.get("assists")),
        "shots": to_int(sh.get("total")), "shots_on_target": to_int(sh.get("on")),
        "passes": to_int(pa.get("total")), "key_passes": to_int(pa.get("key")),
        "passes_accuracy_raw": to_int(pa.get("accuracy")),
        "tackles": to_int(ta.get("total")), "blocks": to_int(ta.get("blocks")),
        "interceptions": to_int(ta.get("interceptions")),
        "duels": to_int(du.get("total")), "duels_won": to_int(du.get("won")),
        "dribbles_attempted": to_int(dr.get("attempts")), "dribbles_successful": to_int(dr.get("success")),
        "fouls_drawn": to_int(fo.get("drawn")), "fouls_committed": to_int(fo.get("committed")),
        "yellow_cards": to_int(ca.get("yellow")), "yellowred_cards": to_int(ca.get("yellowred")),
        "red_cards": to_int(ca.get("red")),
    }


def parse_cached(league: int, season: int, league_ids: set[int]):
    """Yield (player_block, statistics_row) from every cached page."""
    page = 1
    while True:
        path = ApiFootball.cache_path("players", {"league": league, "season": season, "page": page})
        if not path.exists():
            if page == 1:
                sys.exit(f"No cached pages for league {league} season {season}. Run pull_players.py first.")
            print(f"  note: page {page} is not cached; loaded pages 1-{page - 1} only.")
            return
        body = json.loads(path.read_text())
        for entry in body.get("response", []):
            for st in entry.get("statistics", []):
                lg = st.get("league") or {}
                if lg.get("id") in league_ids and to_int(lg.get("season")) == season:
                    yield entry["player"], st
        if page >= (body.get("paging", {}).get("total") or 1):
            return
        page += 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--league", type=int, default=39)
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--dry-run", action="store_true", help="Parse cache and report counts; no database access.")
    args = ap.parse_args()

    cfg = load_config()
    league_ids = set(cfg["leagues"])
    pairs = list(parse_cached(args.league, args.season, league_ids))

    # One fact row per (player, league, team); keep the row with more minutes
    # if the API repeats a key.
    facts: dict[tuple, dict] = {}
    players: dict[str, dict] = {}
    leagues: dict[int, dict] = {}
    teams: dict[int, dict] = {}
    for p, st in pairs:
        sid = str(p["id"])
        players.setdefault(sid, {
            "full_name": full_name(p),
            "birth_date": (p.get("birth") or {}).get("date"),
            "nationality": p.get("nationality"),
        })
        lg, tm = st["league"], st["team"]
        leagues[lg["id"]] = {"league_id": lg["id"], "name": lg.get("name"), "country": lg.get("country")}
        teams[tm["id"]] = {"team_id": tm["id"], "name": tm.get("name")}
        row = {"_source_player_id": sid, "league_id": lg["id"], "team_id": tm["id"], **stat_row(st)}
        key = (sid, lg["id"], tm["id"])
        if key not in facts or (row["minutes"] or 0) > (facts[key]["minutes"] or 0):
            facts[key] = row

    print(f"parsed: {len(players)} players, {len(facts)} player-league-team rows, "
          f"{len(teams)} teams, leagues {sorted(leagues)}")
    if args.dry_run:
        return

    sb = SupabaseRest()
    state = SupabaseState(sb)

    sb.upsert("scouting_dim_season", [{
        "season": args.season, "label": season_label(args.season),
        "is_current": cfg.get("current_season") == args.season,
    }], "season")
    sb.upsert("scouting_dim_league", list(leagues.values()), "league_id")
    sb.upsert("scouting_dim_team", list(teams.values()), "team_id")

    # Resolve source ids -> player_id, creating new players (and mappings) only
    # for ids not seen before. Existing players are never overwritten, so
    # manual fixes / review flags survive a reload.
    mapping: dict[str, int] = {}
    ids = list(players)
    for part in chunks(ids):
        rows = sb.select("scouting_player_source_mapping", {
            "select": "player_id,source_player_id", "source": f"eq.{SOURCE}",
            "source_player_id": "in.(" + ",".join(part) + ")"})
        mapping.update({r["source_player_id"]: r["player_id"] for r in rows})
    new_ids = [i for i in ids if i not in mapping]
    for part in chunks(new_ids):
        inserted = sb.insert("scouting_dim_player", [players[i] for i in part], returning=True)
        if len(inserted) != len(part) or any(
                a["full_name"] != players[i]["full_name"] for a, i in zip(inserted, part)):
            sys.exit("Inserted dim_player rows did not come back in input order; aborting before mapping.")
        sb.insert("scouting_player_source_mapping", [
            {"player_id": a["player_id"], "source": SOURCE, "source_player_id": i}
            for a, i in zip(inserted, part)])
        mapping.update({i: a["player_id"] for a, i in zip(inserted, part)})
    print(f"players: {len(new_ids)} new, {len(ids) - len(new_ids)} already known")

    out = []
    for f in facts.values():
        row = {k: v for k, v in f.items() if k != "_source_player_id"}
        row.update(player_id=mapping[f["_source_player_id"]], season=args.season)
        out.append(row)
    for part in chunks(out):
        sb.upsert("scouting_fact_player_season_stats", part, "player_id,season,league_id,team_id")
    print(f"upserted {len(out)} fact rows")

    pages = state.get_progress(args.league, args.season)
    for page, status in pages.items():
        if status == "fetched":
            state.set_progress(args.league, args.season, page, "loaded")


if __name__ == "__main__":
    main()
