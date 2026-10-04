"""Shared config, env loading and small helpers for the Scouting Radar ETL.

Run everything from the repo root, e.g. `python scripts/etl/probe.py --season 2024`.
Secrets come from the environment or the repo-root .env.local (owner's machine
only; this code never prints them and cloud sessions never have them).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "raw"
CONFIG_PATH = Path(__file__).resolve().parent / "etl.config.json"
API_BASE = "https://v3.football.api-sports.io"


def load_env() -> None:
    """Load KEY=VALUE lines from .env.local without overriding real env vars."""
    path = REPO_ROOT / ".env.local"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing {name}. Set it in your local .env.local (see .env.example).")
    return value


def load_config() -> dict:
    cfg = json.loads(CONFIG_PATH.read_text())
    cfg["leagues"] = {int(k): v for k, v in cfg["leagues"].items()}
    return cfg


def season_label(season: int) -> str:
    return f"{season}/{str(season + 1)[-2:]}"


def to_int(value):
    """API returns null for 'not recorded'; keep that as None, never 0."""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def to_num(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
