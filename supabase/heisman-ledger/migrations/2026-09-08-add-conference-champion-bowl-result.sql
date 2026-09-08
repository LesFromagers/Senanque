-- Adds conference_champion, bowl_name, and bowl_result to
-- heisman_ledger_seasons.
--
-- Why this file exists: schema.sql creates the table with
-- `create table if not exists`, so re-running it against a project where
-- the table ALREADY exists is a no-op and will NOT add these columns. If
-- you already ran schema.sql in this Supabase project before these
-- columns existed, run this migration before seed.sql -- otherwise every
-- insert fails with `column "conference_champion" of relation
-- "heisman_ledger_seasons" does not exist`. On a brand-new project,
-- schema.sql alone is enough and this file is a harmless no-op.
--
-- These replace what used to be a scoring-time text search over
-- source_notes/conference/national_title_claim for "did OU win the
-- conference" and "did OU win its bowl game" -- that approach had real
-- bugs (a bowl loss recorded as "L 19-55" scored as a win on 19 seasons
-- in the live dataset). Populated directly from the Wikipedia infobox's
-- 'champion'/'bowl'/'bowl_result' params by
-- scripts/heisman_ledger/pull_wikipedia.py -- see that script's
-- classify_champion_segments() and lib/heisman-ledger/accomplishment-scoring.ts.

alter table heisman_ledger_seasons
  add column if not exists conference_champion text,
  add column if not exists bowl_name text,
  add column if not exists bowl_result text;
