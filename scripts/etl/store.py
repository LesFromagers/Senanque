"""Request-ledger and per-page progress persistence.

Default backend is Supabase (service-role key, REST). `--local-state` swaps in
a JSON file under data/raw/ so the first probe can run before the migration is
applied. NOTE: the two backends keep separate ledgers, so the daily cap is only
exact within one backend; use Supabase for real backfills.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import requests

from common import RAW_DIR, load_env, require_env
import os

LEDGER = "scouting_etl_request_ledger"
PROGRESS = "scouting_etl_page_progress"


def utc_day_start() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


class SupabaseRest:
    """Minimal PostgREST client (service role). Avoids extra dependencies."""

    def __init__(self) -> None:
        load_env()
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or ""
        if not url:
            raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL in your local .env.local.")
        key = require_env("SUPABASE_SERVICE_ROLE_KEY")
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    def _check(self, r: requests.Response) -> requests.Response:
        if not r.ok:
            raise SystemExit(f"Supabase error {r.status_code} on {r.request.method} {r.url.split('?')[0]}: {r.text[:300]}")
        return r

    def select(self, table: str, params: dict | None = None) -> list[dict]:
        out, offset = [], 0
        while True:  # page past PostgREST's default row cap
            h = {**self.headers, "Range-Unit": "items", "Range": f"{offset}-{offset + 999}"}
            rows = self._check(requests.get(f"{self.base}/{table}", headers=h, params=params or {}, timeout=60)).json()
            out += rows
            if len(rows) < 1000:
                return out
            offset += 1000

    def count(self, table: str, params: dict) -> int:
        h = {**self.headers, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}
        r = self._check(requests.get(f"{self.base}/{table}", headers=h, params={**params, "select": "id"}, timeout=60))
        return int(r.headers.get("Content-Range", "*/0").split("/")[-1])

    def insert(self, table: str, rows: list[dict], returning: bool = False) -> list[dict]:
        if not rows:
            return []
        h = {**self.headers, "Content-Type": "application/json",
             "Prefer": "return=representation" if returning else "return=minimal"}
        r = self._check(requests.post(f"{self.base}/{table}", headers=h, data=json.dumps(rows), timeout=120))
        return r.json() if returning else []

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> None:
        if not rows:
            return
        h = {**self.headers, "Content-Type": "application/json",
             "Prefer": "resolution=merge-duplicates,return=minimal"}
        self._check(requests.post(f"{self.base}/{table}", headers=h, params={"on_conflict": on_conflict},
                                  data=json.dumps(rows), timeout=120))


class SupabaseState:
    def __init__(self, sb: SupabaseRest | None = None) -> None:
        self.sb = sb or SupabaseRest()

    def requests_today(self) -> int:
        return self.sb.count(LEDGER, {"requested_at": f"gte.{utc_day_start()}"})

    def log_request(self, entry: dict) -> None:
        self.sb.insert(LEDGER, [entry])

    def set_progress(self, league: int, season: int, page: int, status: str,
                     total_pages: int | None = None, note: str | None = None) -> None:
        self.sb.upsert(PROGRESS, [{
            "league_id": league, "season": season, "page": page, "status": status,
            "total_pages": total_pages, "note": note,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }], "league_id,season,page")

    def get_progress(self, league: int, season: int) -> dict[int, str]:
        rows = self.sb.select(PROGRESS, {"league_id": f"eq.{league}", "season": f"eq.{season}"})
        return {r["page"]: r["status"] for r in rows}


class LocalState:
    path = RAW_DIR / "_local_state.json"

    def __init__(self) -> None:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {"ledger": [], "progress": {}}

    def _save(self) -> None:
        self.path.write_text(json.dumps(self.data, indent=1))

    def requests_today(self) -> int:
        day = utc_day_start()
        return sum(1 for e in self.data["ledger"] if e["requested_at"] >= day)

    def log_request(self, entry: dict) -> None:
        self.data["ledger"].append(entry)
        self._save()

    def set_progress(self, league, season, page, status, total_pages=None, note=None) -> None:
        self.data["progress"][f"{league}:{season}:{page}"] = status
        self._save()

    def get_progress(self, league, season) -> dict[int, str]:
        prefix = f"{league}:{season}:"
        return {int(k.split(":")[2]): v for k, v in self.data["progress"].items() if k.startswith(prefix)}


def make_state(local: bool):
    return LocalState() if local else SupabaseState()
