# Heisman Park Ledger — data pipeline

Six scripts, run in order, that turn the 27 hand-verified rows in
`data/heisman-ledger/ou_seasons_verified.csv` plus a Wikipedia bulk pull into
the merged dataset the dashboard and the Supabase schema consume.

```
pull_wikipedia.py     # Step 1 — the ~105 remaining seasons, Wikipedia only
pull_cfbd.py          # Step 2 — SP+/efficiency + raw yardage/turnovers,
                       #          2005-present, CFBD API
pull_ncaa.py           # Step 2b — national per-season scoring/yardage averages,
                       #          1937-present, NCAA's own records book. Feeds
                       #          lib/heisman-ledger/national-baseline.ts, not
                       #          the season merge below — writes straight to
                       #          data/heisman-ledger/national_baseline.json.
                       #          Independent of the other steps; run it any
                       #          order relative to them.
merge_dataset.py      # Step 3 — merge verified + pulled + CFBD, assign data_tier,
                       #          emit the master season/game CSVs + a gap report
csv_to_json.py        # Step 4 — master_seasons.csv -> the JSON the Next.js app imports
generate_seed_sql.py  # Step 5 — master CSVs -> supabase/heisman-ledger/seed.sql
```

## Hard constraints (see `Heisman-Park-Ledger-Cowork-Brief.md`)

- **Wikipedia only** for the automated/bulk pull. Real `User-Agent`, throttled
  to ~1 request/sec (`--sleep`).
- **Never build an automated scraper against Sports-Reference or similar
  ToS-restricted sites.** If a fact there would help, this pipeline logs a
  gap instead of reaching for it — cross-checking those sites is a manual,
  human-paced job for Matt, not something this script should ever attempt.
- **Never fabricate.** Every field that doesn't come back from a legitimate
  fetch is left `NULL`/blank and logged to a gap report, not guessed. This is
  why `pull_cfbd.py` pulls OU's own raw yardage/turnovers but leaves
  "yards allowed" (defensive yardage) alone entirely — CFBD's season-stats
  endpoint doesn't split by offense/defense, and computing a real
  yards-allowed figure would mean reconciling every opponent's own season
  stats game-by-game, which this pipeline doesn't do. `defense_ppa` (already
  pulled, era- and opponent-adjusted) is the real defensive-quality number;
  don't add a guessed yards-allowed column in its place.

## Running it

```bash
cd scripts/heisman_ledger
pip install -r requirements.txt

# Step 1 — Wikipedia (network access to en.wikipedia.org required)
python pull_wikipedia.py --out ../../data/heisman-ledger/pulled

# Step 2 — CFBD (needs CFBD_API_KEY in the environment; never paste the key
# into a file or commit — export it in your shell for this one run)
CFBD_API_KEY=... python pull_cfbd.py --out ../../data/heisman-ledger/pulled

# Step 2b — NCAA national baseline (no key needed; requires `pdftotext`
# on PATH — apt-get install poppler-utils, or brew install poppler)
python pull_ncaa.py --out ../../data/heisman-ledger/national_baseline.json

# Step 3 — merge everything
python merge_dataset.py \
  --verified ../../data/heisman-ledger/ou_seasons_verified.csv \
  --pulled ../../data/heisman-ledger/pulled \
  --out ../../data/heisman-ledger/master

# Step 4 — regenerate the JSON the Next.js app imports
python csv_to_json.py

# Step 5 — regenerate the Supabase seed file
python generate_seed_sql.py
```

`merge_dataset.py` never overwrites a verified row — the 27 seasons in
`ou_seasons_verified.csv` win every field-level conflict, no exceptions.

## Setting up Supabase (one-time)

The dashboard works today with zero Supabase setup — `lib/heisman-ledger/data.ts`
reads the committed static JSON until it sees Supabase credentials. Wiring
up the real database:

1. At [supabase.com](https://supabase.com), create a new project (any
   region; the free tier is plenty for this dataset's size).
2. In **Project Settings → API**, copy the **Project URL** and the
   **anon public** key. Do *not* copy the service-role/secret key into
   anything committed or pasted into a cloud AI session — it only ever
   belongs in your own shell environment for a one-off script run.
3. In the Supabase dashboard's **SQL Editor**, paste and run
   `supabase/heisman-ledger/schema.sql`, then `supabase/heisman-ledger/seed.sql`.

   **If the project already existed before the CFBD counting-stat columns
   landed**, run `supabase/heisman-ledger/migrations/2026-08-25-add-cfbd-counting-stats.sql`
   in between. `schema.sql` uses `create table if not exists`, so re-running
   it against an existing table adds nothing, and `seed.sql` will fail with
   `column "offense_total_yards" ... does not exist`.
4. Add to Vercel's Environment Variables (Project Settings → Environment
   Variables) and to your local `.env.local`:
   - `SUPABASE_URL` — the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon public key
5. Redeploy (or restart `npm run dev` locally). `getSeasons()` picks up
   Supabase automatically — no other code change needed.

Re-run `generate_seed_sql.py` and re-paste `seed.sql` any time
`merge_dataset.py` produces a new `master_seasons.csv` (e.g. after the
Wikipedia bulk pull finishes, or a manual-review fix lands).

## Offline self-test

`pull_wikipedia.py`'s table/infobox parsing can be exercised without network
access, against a saved wikitext fixture:

```bash
python test_parser.py
```

This is how the parser was validated in the session that wrote it — this
sandbox's network policy didn't allow live `en.wikipedia.org` calls, so the
fixture stands in until the real pull is run somewhere with access.
