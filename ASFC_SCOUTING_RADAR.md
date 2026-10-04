# ASFC Scouting Radar — Build Spec

Companion to CLAUDE.md and DESIGN.md. Everything in those files still applies: hub-and-spoke routing, the secrets pattern, the security checklist, and the brand tokens. This file only adds what is specific to this project.

## What it is
A scouting tool for comparing real players from Europe's Big 5 leagues, framed as the tool a manager of ASFC would use to decide who to pick. ASFC (Les Fromagers Abbey Senanque Football Club) is a fantasy team and the origin of the Senanque name. It has no data of its own: every number on the page is real league data viewed through that lens. Never imply otherwise.

Reference for the interaction pattern: datamb.football (player profiles, radar comparison). This is not a clone. Free data cannot match its advanced metrics (xG, progressive actions).

## Route and registry
- Display name: **ASFC Scouting Radar**
- Route: `/analytics/scouting-radar` (analytics wing). Add a registry entry like the other projects.

## Scope
**In v1**
- Big 5 leagues: Premier League, La Liga, Bundesliga, Serie A, Ligue 1. Build the pipeline once, get the Premier League working end to end first, then re-run the same pipeline for the other four.
- Season-level stats only, one row per player per season.
- Percentile radar (default view), with a button that swaps the view to a scatter plot and a beeswarm plot side by side.
- Multi-season comparison: any slot can be any player in any available season (e.g. the same player in two different seasons).

**Out of v1 (do not build)**
- StatsBomb data, shot maps, pass maps (coverage is too narrow to promise across these leagues)
- Match-level facts, rolling form charts (need fixture-level calls; revisit with a paid plan)
- Watchlist, accounts, saved state
- Goalkeepers, and comparing across position groups
- football-data.org, dark mode

## Data source and API access
- **API-Football** via a direct api-sports.io account (not RapidAPI). Base URL `https://v3.football.api-sports.io`, header `x-apisports-key`. Env var: `API_FOOTBALL_KEY`.
- League IDs (confirm via the `/leagues` endpoint): Premier League 39, La Liga 140, Bundesliga 78, Serie A 135, Ligue 1 61.
- The free plan allows 100 requests/day and appears to restrict which seasons are reachable (reportedly 2022–2024 only; the current season errors). The owner runs a probe and records the result here:

```
API-Football plan: ______        (FREE / PAID)
Seasons reachable: ______        (e.g. 2022–2024 / includes current season)
Current season (2026) reachable: ______   (yes / no)
```

**One codebase, two scenarios.** Season reachability must be configuration, not hardcoded.
- *Seasons limited (free):* pull each reachable completed season once. The page is honest about its range ("Seasons 2022–2024"). No refresh job.
- *Current season reachable (paid):* same pipeline, plus `dim_season.is_current = true` for the current season, which is re-pulled twice weekly. Completed seasons are pulled once and never touched again.

## Request budget rules (non-negotiable)
- The website **never** calls API-Football. It reads only from Supabase.
- Every request is logged in a ledger table. The ETL stops at a configurable daily cap (default 90, to leave headroom).
- The ETL is resumable: progress is tracked per league + season + page, so a stopped run picks up where it left off.
- Cache every raw API response to `data/raw/` (add to `.gitignore`) so schema changes can be reprocessed without spending requests again.
- Before committing to a backfill plan, make a tiny test pull and report the real request cost per league-season (page size, number of pages). Do not trust estimates.
- Past seasons: pull season aggregates via the paginated players endpoint by league + season. Do not attempt match-level backfills.

## Data model (Supabase Postgres)
- `dim_player` — `player_id` (generated surrogate key), `full_name`, `birth_date`, `nationality`
- `player_source_mapping` — `player_id`, `source` (v1: `api_football` only), `source_player_id`, `needs_review`, `notes`; unique on (`source`, `source_player_id`). Kept so a second source can be added later. When that happens: match on normalized name + birth date + nationality, flag anything ambiguous for manual review, and keep a small manual-overrides table. Do not silently guess.
- `dim_league`, `dim_team`
- `dim_season` — `season` (start year), `label` (e.g. 2024/25), `is_current`
- `fact_player_season_stats` — grain: player + season + league + team. Domestic league rows only (exclude cups and European competitions). Store the numeric fields the API actually returns (appearances, starts, minutes, position, goals, assists, shots, shots on target, passes, key passes, tackles, blocks, interceptions, duels, dribbles, fouls drawn/committed, cards). Define exact columns from a real response, not from memory.
- `fact_player_percentiles` — long format: `player_id`, `season`, `position_group`, `metric`, `value_per90`, `percentile`, `pool_size`, `computed_at`
- ETL bookkeeping: request ledger and per-page progress tables.

Players who change clubs within the Big 5 mid-season have multiple rows. For percentiles, aggregate them to one player-season (sum counts and minutes; position from the row with the most minutes).

## Percentile method
- Convert counting stats to **per-90** before ranking. Ratio metrics (pass accuracy, duels won %) come from counts where both exist.
- **Minimum minutes: 450** (constant `MIN_MINUTES`, easy to change). Players below it are excluded from the peer pool.
- Peer pool = same **position group** (Defender, Midfielder, Attacker) and same **season**, pooled across all five leagues.
- Use `CUME_DIST() OVER (PARTITION BY position_group, season ORDER BY value_per90)`. Tied values share a percentile.
- Metrics where lower is better (fouls committed, cards) are inverted.
- Percentiles are precomputed as the last ETL step. Never computed per page load.
- Always show the league next to a number. Do not imply a Ligue 1 stat and a Premier League stat are on equal footing.

## Radar metric sets (v1 defaults — validate against the real API fields and propose changes in plan mode)
- **Attackers:** goals, assists, shots, shots on target, key passes, successful dribbles, fouls drawn (all per 90)
- **Midfielders:** goals, assists, key passes, passes, pass accuracy, tackles, interceptions, duels won %, successful dribbles
- **Defenders:** tackles, interceptions, blocks, duels won %, passes, pass accuracy, fouls committed (inverted), cards (inverted)

## Page behavior
- Selector row at the top, which stays fixed between views: choose up to 4 comparison slots, each a player + season. Slots must share a position group; selecting someone from another group shows a gentle message rather than a broken chart.
- Default view: percentile radar. Hover shows the raw per-90 value, minutes played, club, and league.
- A toggle button swaps the view below the selector to **scatter + beeswarm, side by side**. Inputs do not reset.
- Scatter: the user picks two metrics. The whole peer pool is faint background dots; selected players are highlighted.
- Beeswarm: one metric, the full peer-pool distribution, selected players highlighted.
- Footer attribution: "Data: API-Football."
- Empty and error states are honest and quiet ("No data loaded yet", or a graceful message if Supabase is unreachable).
- Chart libraries: Recharts for radar and scatter. Propose the beeswarm approach in plan mode (d3 beeswarm layout or a deterministic-jitter strip plot).

## Design
Use DESIGN.md tokens (Oat, Charcoal, Plum, Gold, Sage, Stone; Fraunces + Inter). Sage and Stone are close in lightness, so distinguish multi-series charts with marker shape or line style as well as color. Optional touches: use the ASFC crest in the page header if `/public/asfc-crest.png` exists (otherwise omit it); a deadpan loading message from Eric Cantona's famous press-conference line about seagulls following a trawler.

## Security (in addition to CLAUDE.md)
- `SUPABASE_SERVICE_ROLE_KEY` lives **only** in the owner's local `.env.local` (and later a GitHub Actions secret if a scheduled job is added). It is **never** added to Vercel and never reaches the browser. The website needs only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `API_FOOTBALL_KEY` is used only by ETL scripts, never by the website.
- Every new table: RLS on, an explicit read-only (`select`) policy for the public role, and an explicit `GRANT SELECT` to the anon role (the project has "automatically expose new tables" turned off). No insert/update/delete policies for public roles.
- Add placeholder lines only to `.env.example`: `API_FOOTBALL_KEY=`, `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`. Never create `.env.local` or ask for real values in a cloud session.
- No fabricated or placeholder statistics anywhere in committed code or fixtures.

## Who runs what
- Code writes the SQL migration (`supabase/migrations/`) and the ETL scripts (`scripts/etl/`). The owner applies the migration in the Supabase SQL editor and runs the ETL locally with `.env.local`. A cloud Code session has no keys and does not touch the live API or database.
- Supabase's free tier pauses after about a week of inactivity, and the page depends on it. Plan a small keep-alive (a scheduled read) right after launch.

## Build order
1. Add a short roadmap entry to CLAUDE.md pointing at this file (do not paste the spec in).
2. SQL migration: tables, RLS, grants.
3. ETL scripts: resumable, budget-aware, raw-response caching. Premier League, one season first.
4. Percentile computation (SQL).
5. Page: selector and radar.
6. Toggle: scatter + beeswarm.
7. Re-run the pipeline for the other four leagues and the remaining reachable seasons.
8. Polish, attribution, empty/error states, optional touches.

## Done when
- A visitor can pick up to 4 same-position player-seasons and see a percentile radar, then toggle to scatter + beeswarm with the selection unchanged.
- Every displayed stat shows its league and season.
- All five leagues and every reachable season are loaded.
- The website makes zero live API-Football calls.
- No secrets in the repo; RLS verified; `.env.example` updated.
