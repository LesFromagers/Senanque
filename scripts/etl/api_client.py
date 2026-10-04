"""The ONLY module that talks to API-Football. Budget-aware and cache-first.

Order of operations for every call:
  1. raw-cache hit        -> return it, zero requests spent, nothing ledgered
  2. today's ledger >= cap -> raise CapReached BEFORE touching the network
  3. real request, always ledgered (even failures cost quota)
Only error-free responses are cached.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

from common import API_BASE, RAW_DIR, load_env, require_env


class CapReached(Exception):
    """The configured daily request cap has been reached."""


class ApiPlanError(Exception):
    """API answered 200 but with `errors` (e.g. season not on this plan)."""


class ApiFootball:
    def __init__(self, state, daily_cap: int, min_interval: float) -> None:
        load_env()
        self.key = require_env("API_FOOTBALL_KEY")
        self.state = state
        self.cap = daily_cap
        self.min_interval = min_interval
        self._last = 0.0
        self.spent_this_run = 0

    @staticmethod
    def cache_path(endpoint: str, params: dict) -> Path:
        name = "_".join(f"{k}-{v}" for k, v in sorted(params.items())) or "all"
        return RAW_DIR / endpoint.strip("/") / f"{name}.json"

    def get(self, endpoint: str, params: dict) -> tuple[dict, bool]:
        """Return (json_body, from_cache)."""
        path = self.cache_path(endpoint, params)
        if path.exists():
            return json.loads(path.read_text()), True

        if self.state.requests_today() >= self.cap:
            raise CapReached(f"Daily cap of {self.cap} requests reached.")

        wait = self.min_interval - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)  # free plan also has a per-minute limit
        resp = requests.get(f"{API_BASE}/{endpoint.strip('/')}", params=params,
                            headers={"x-apisports-key": self.key}, timeout=60)
        self._last = time.monotonic()
        self.spent_this_run += 1

        body: dict = {}
        try:
            body = resp.json()
        except ValueError:
            pass
        errors = body.get("errors") or None  # [] when fine, dict/list when not
        remaining = resp.headers.get("x-ratelimit-requests-remaining")
        self.state.log_request({
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "endpoint": endpoint, "params": params, "http_status": resp.status_code,
            "api_errors": errors,
            "requests_remaining": int(remaining) if remaining and remaining.isdigit() else None,
        })

        if resp.status_code == 429:
            raise CapReached("API-Football returned 429 (rate limited); stop and resume later.")
        if not resp.ok:
            raise SystemExit(f"HTTP {resp.status_code} from API-Football: {resp.text[:200]}")
        if errors:
            raise ApiPlanError(json.dumps(errors))

        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(body))
        return body, False

    def players_page(self, league: int, season: int, page: int) -> tuple[dict, bool]:
        return self.get("players", {"league": league, "season": season, "page": page})
