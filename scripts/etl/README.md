# Scouting Radar ETL

Spec: `/ASFC_SCOUTING_RADAR.md`. You run these locally; a cloud Claude session has no keys and never calls the API or database. Run everything from the **repo root**.

## One-time setup
```
python3 -m pip install -r scripts/etl/requirements.txt
```
Create `.env.local` (gitignored) with `API_FOOTBALL_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. The service-role key stays local and never goes to Vercel.
Apply `supabase/migrations/2026-10-04-scouting-radar.sql` in the Supabase SQL editor (safe to re-run).

## Run order
1. **Probe** (1 request per season tested): `python3 scripts/etl/probe.py --season 2022 --season 2023 --season 2024 --season 2025 --season 2026`
   Add `--local-state` if the migration isn't applied yet. Record plan, reachable seasons and requests-per-league-season in the spec's probe block, and set `seasons` / `current_season` in `etl.config.json`. Check the printed key paths against the migration's columns; tell Claude if any differ.
2. **Pull** one Premier League season: `python3 scripts/etl/pull_players.py --league 39 --season 2024` (try `--max-pages 2` first). Hits the daily cap (default 90) → stops, saves progress; re-run next UTC day. Raw JSON lands in `data/raw/` (gitignored).
3. **Check parsing, no DB:** `python3 scripts/etl/load_stats.py --league 39 --season 2024 --dry-run`
4. **Load:** `python3 scripts/etl/load_stats.py --league 39 --season 2024`
5. Later (build step 7): repeat 2 + 4 for leagues 140, 78, 135, 61 and every reachable season: `--all-config-seasons`.

## Rules baked in
- Website never imports anything here. Only `api_client.py` touches the network.
- Cache first (cache hits are free), then the cap check, then the request; every real request is ledgered, including failures.
- Completed seasons are pulled once. Only if `current_season` is reachable (paid): re-pull it twice weekly by deleting that season's files under `data/raw/players/` and re-running pull + load.
- Nothing is ever defaulted to 0: nulls from the API stay null.

## Owner's probe result (recorded here; the spec file is left verbatim)
- API-Football plan: FREE (100 requests/day)
- Seasons reachable: 2022–2024 only; current season blocked
- Scenario: **seasons limited** — pull each of 2022, 2023, 2024 once per league (set in `etl.config.json`, `current_season` stays null). No refresh job; the page should say "Seasons 2022–2024". Still run `probe.py` once to get the real requests-per-league-season before backfilling (15 league-seasons in total).

## Open items (resolve from the real probe output)
- Real requests per league-season (cost table): _unfilled_
- Meaning of `passes.accuracy` (count vs percent) — decides how pass accuracy is derived in the percentile step.
