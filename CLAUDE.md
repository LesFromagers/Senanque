# CLAUDE.md — Senanque

See @DESIGN.md for the full visual brief — palette, typography, and open design questions. It loads automatically alongside this file.

## What this project is
Senanque is a data analytics and agentic AI portfolio — one shared app that grows a project at a time, not a collection of separate sites. The name comes from the Abbey of Sénanque in Provence (Cistercian, founded 1148), visited in person. It anchors the site's persona ("Le Fromager" / "Les Fromagers") without that persona needing to be spelled out on every page.

Primary audience: hiring managers and recruiters for BI Analyst / Data Analyst roles, Oklahoma City-based. Secondary audience: professional network, via referral more than cold search.

## Architecture — hub and spoke
- One shared Next.js app is the shell. Every new project idea becomes a **route + a registry entry** — never a new repo, never a new deploy.
- Two wings, used as section labels inside the site, not as domain names or subdomains:
  - **Analytics wing** (`/analytics/[slug]`) — traditional BI/data work: ETL, SQL, dashboards. Current focus.
  - **Agentics wing** (`/agentics/[slug]`) — LLM-orchestrated projects. Deliberately deferred until the analytics wing has shipped cleanly. This is a new skill being grown into on its own timeline, not rushed under job-search pressure.
- Keep a central project registry (e.g. `lib/projects.ts`, or a Supabase table later) listing: title, slug, wing, short description, data source type. The homepage renders from this list — it should never need hand-editing per launch.

## Brand
- Domain: senanque.dev (registered via Squarespace; DNS points to Vercel)
- Repo: public — github.com/LesFromagers/Senanque
- Voice: honest, craftsmanlike, understated. Gaps (e.g. SQL depth) get named directly, never hidden or apologized for at length. Let the Senanque name and the work itself carry personality — keep page copy legible to an 8-second recruiter skim, not dependent on knowing the backstory.

## Current roadmap
1. **Bailey Bros. Economic Barometer** (analytics wing, route: `/analytics/bailey-bros`) — FRED API, one key covers every series below. Ships with all seven indicators at launch:
   - Fed funds rate (`FEDFUNDS`, monthly)
   - CPI, year-over-year (`CPIAUCSL`, monthly)
   - Unemployment rate (`UNRATE`, monthly)
   - S&P 500 (`SP500`, daily)
   - Consumer sentiment (`UMCSENT`, monthly)
   - 10Y–2Y Treasury yield spread (`DGS10` minus `DGS2`, daily)
   - Oklahoma coincident economic index (`OKPHCI`, monthly)

   Time range: 2008–present, to capture the financial crisis through today. The two daily-cadence series (S&P 500, yield spread) carry ~17 years of points — default to a monthly-aggregate view with drill-to-daily rather than rendering every trading day. First to ship — ties directly to a live application.

2. **The Heisman Park Ledger** (analytics wing, route: `/analytics/heisman-park-ledger`) — every OU football season, 1895–present, ranked by a normalized Power Index. Tagline "Coronation at the Palace on the Prairie." Ships with the 27 hand-verified marquee seasons live; the other ~104 seasons fill in via the pull scripts below, tracked on the dashboard's own manual-review worklist (`/analytics/heisman-park-ledger/gaps`), not hidden. Second to ship.

   **Power Index formula** (`lib/heisman-ledger/power-index.ts`):
   ```
   Power Index = (0.50 × Performance) + (0.35 × Accomplishment) + (0.15 × Talent)
   ```
   - **Performance (50%):** point differential z-score vs. national average that season (50% of this layer) + SRS-style strength-of-schedule margin (30%) + offense/defense efficiency z-scores (10% each), each efficiency number tagged with a `data_tier` (1 = SP+/advanced ~2005+, 2 = yards/play ~1950s+, 3 = yards/game vs. national rank pre-1950s, 4 = points-only for the thinnest seasons). See `scripts/heisman_ledger/` for the tier waterfall logic.
   - **Accomplishment (35%):** national title, conference title, final AP rank, bowl result — point table in `lib/heisman-ledger/accomplishment-scoring.ts`.
   - **Talent (15%):** Heisman winner/finalists, All-Americans, draft picks by round — point table in `lib/heisman-ledger/talent-scoring.ts`.
   - **Tiebreaker (not part of the weighted score):** if two seasons land within 1.0 point of each other on the final 0–100 scale, `beat_texas` ranks higher; if tied on that, `beat_osu`; if still tied, raw point-differential z-score. Both booleans are stored per season for this purpose and for UI badges — never folded into the composite weights themselves.

   **Data sources — three, each with one job:**
   - **Wikipedia REST API** — primary source for OU's own season-by-season record, coach, opponents, scores, honors, 1895–present. Public, CC-licensed, built for reuse — safe for automated/bulk pulls. Set a real `User-Agent` header, throttle to ~1–2 req/sec.
   - **collegefootballdata.com API** — Tier 1 advanced efficiency data, 2005–present. Free API key required (stored per the secrets pattern below).
   - **NCAA.com / NCAA.org archived stats** — national per-season scoring/yardage averages, used as the era-normalization baseline for the Performance layer's z-scores. Coverage begins 1937 (NCAA's own official stat-keeping start — no reliable national baseline exists before this, which is a real historical limit, not a research gap). Check the specific archive page's terms before building an automated pull, same as any new source.
   - **Sports-Reference / SoonerStats** — cross-reference only, **never automated**. Their ToS prohibits bot/automated access regardless of which tool drives it (script, skill, Claude Code, or Cowork). Use only for manual, human-paced lookups to resolve a specific flagged gap.

   **Tool division of labor for this project** (this is the part that's caused confusion — keep it explicit):
   - **Claude Code (web)** runs the actual pull scripts against Wikipedia, CFBD, and NCAA archives. This requires the cloud session's network access to explicitly allowlist `en.wikipedia.org`, `api.collegefootballdata.com`, and the relevant NCAA domain(s) — by default, Code's cloud sandbox only trusts GitHub and the Anthropic API, so pulls will silently fail until this is configured in the environment's network settings. Configure this once per environment, not per session.
   - **Cowork / manual browsing** handles the human-paced Sports-Reference/SoonerStats cross-checks for flagged gaps, and drafts first-pass "iconic moment" season summaries (~15–25 marquee seasons) for a later voice-editing pass — it is not the tool for running automated data pulls.
   - **This planning thread (claude.ai)** is where formula, data-sourcing, and design decisions get made — CLAUDE.md is the durable record that carries those decisions into Code/Cowork sessions, so decisions don't need to be re-explained each time a new session starts.

3. **Coffee Consumption** — needs a full rebuild before it's shown publicly. The earlier version used fabricated data, which directly undercuts the "I make people trust the numbers" pitch this whole site makes. Do not reuse the old dataset — rebuild from a real source (personal log or a public dataset like ICO/USDA).
4. **Chess app** — a secondary "I can build things" demo, not a headline project.
5. **Agentics wing** (theology comparator, film/music theme analyzers) — later, as its own dedicated sprint once the analytics wing is solid.

## Bailey Bros. Economic Barometer: calls-to-action logic
Each indicator card shows a data-driven action line under its chart — computed from real thresholds below, not hand-written per card. Two audiences side by side (bank lens / VC lens), resolving the earlier open question about which employer framing to use by not forcing a choice between them.

- **Fed funds rate** — compare latest reading to the reading 3 months prior. Direction (rising/falling) drives which action text shows.
- **CPI, year-over-year** — band by level: under 2.5% = "near target," 2.5–4% = "elevated," above 4% = "high inflation." Elevated/high triggers margin-pressure (bank) and real-return-erosion (VC) language.
- **Unemployment** — implement the **Sahm Rule**: flag a recession warning if the 3-month moving average of the unemployment rate sits 0.5 percentage points or more above its lowest point in the trailing 12 months. This is a real, established indicator (Claudia Sahm) — historically validated, not an invented threshold.
- **S&P 500** — % drawdown from the trailing 52-week high. -10% = "correction," -20% = "bear market," each with distinct action text.
- **Consumer sentiment** — 3-month trend direction (rising/falling); no universally agreed absolute target the way CPI has one.
- **10Y–2Y yield spread** — binary: negative value = inverted, triggers recession-warning language.
- **Oklahoma coincident index** — 3-month trend direction, same logic as consumer sentiment.
- **Compound signal (the standout feature):** if the yield spread is inverted AND the Sahm Rule is triggered at the same time, surface one distinct, more prominent callout above the individual cards — not just two cards that happen to both be flagged. This combination has historically preceded downturns more reliably than either signal alone. Label the two states after *It's a Wonderful Life*: calm reading = "Bedford Falls," compound warning = "Welcome to Pottersville."

This reading → threshold → action pattern should generalize to future analytics-wing projects as they're built, not stay a one-off for this page.

## Data & secrets pattern
This list of keys will grow — don't treat it as fixed, treat the *pattern* as fixed:
- Every external API key lives in `.env.local`, never committed. `.gitignore` already excludes `.env*`.
- Server-only keys (FRED, CFBD, Supabase service role) carry **no** `NEXT_PUBLIC_` prefix and are only ever referenced inside API routes (`app/api/.../route.ts`) or Server Components — never in `"use client"` code.
- Only the Supabase anon key is prefixed `NEXT_PUBLIC_` and shipped to the browser — by design, and only safe because Row Level Security is doing the real access control underneath it.
- Static/historical data that won't change (e.g. a pulled snapshot of OU rankings history) can live as committed JSON/CSV rather than round-tripping through the database.
- When a new project needs a new key: add it to `.env.local`, add a placeholder line (no real value) to `.env.example` so the pattern stays visible in the repo, and note the new source in the roadmap section above.
- Cloud sessions (Claude Code on the web) should only ever create `.env.example` with placeholders — `.env.local` is gitignored, so it never survives a push/pull anyway. Real key values go directly into Vercel's Environment Variables for the live app, and into a locally-created `.env.local` for testing on your own machine after a `git pull`. Code should never be asked to hold or paste a real key value during a cloud session.
- **Network access for cloud sessions:** any project that pulls from an external API (Heisman Park Ledger's Wikipedia/CFBD/NCAA pulls, or any future project's live data source) needs its cloud environment's network allowlist configured with the specific domains required — this is a one-time setup per environment, done in Claude Code's cloud environment settings, not something to rediscover per session when a pull script "just fails."

## Security checklist — apply every session
- Never hardcode a secret; never suggest committing `.env*`.
- Any new Supabase table: confirm RLS is on (the automatic-RLS trigger is enabled for this project) and write an explicit read-only policy before exposing it — nothing stays open by default.
- Review the diff before every push. Watch especially for a real key accidentally pulled into a test file or example while debugging.
- 2FA is enabled on GitHub, Vercel, Supabase, and the domain registrar. Any new service added to the stack gets 2FA turned on too, not assumed.
- Before the Agentics wing goes live: set a hard spend cap in the Anthropic API console and rate-limit any public-facing endpoint that calls it.

## Adding a new project (the repeatable recipe)
1. Add a new route folder under the correct wing (`/analytics/[slug]` or `/agentics/[slug]`).
2. Add an entry to the project registry (title, slug, wing, description, data source type).
3. Wire the data source following the pattern above — static file, Supabase table with RLS, or a live external API call from a server route.
4. Add the project to the roadmap list in this file so future sessions know its status.

## Local dev launcher
The primary build happens in Claude Code on the web. These scripts matter for previewing changes locally after a `git pull` — create two double-clickable scripts at the repo root so opening the site locally doesn't require typing terminal commands:
- `RUN.command` (Mac) — `cd` to the script's own directory, run `npm run dev`, then open `http://localhost:3000` in the default browser. Must be made executable (`chmod +x RUN.command`) to be double-clickable from Finder.
- `RUN.bat` (Windows) — same behavior: `cd /d %~dp0`, `start http://localhost:3000`, then `npm run dev`.

## Stack
- Next.js (App Router), Tailwind
- Supabase (Postgres) for growing/queryable datasets
- Vercel (Hobby plan), auto-deploy on push to `main`
- Claude Code for development
