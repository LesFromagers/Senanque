-- Adds draft_picks_r1_2, draft_picks_r3_7, and draft_picks_detail to
-- heisman_ledger_seasons.
--
-- Why this file exists: schema.sql creates the table with
-- `create table if not exists`, so re-running it against a project where
-- the table ALREADY exists is a no-op and will NOT add these columns. If
-- you already ran schema.sql in this Supabase project before these
-- columns existed, run this migration before seed.sql -- otherwise every
-- insert fails with `column "draft_picks_r1_2" of relation
-- "heisman_ledger_seasons" does not exist`. On a brand-new project,
-- schema.sql alone is enough and this file is a harmless no-op.
--
-- Populated by scripts/heisman_ledger/pull_draft_picks.py, reading
-- Wikipedia's "List of Oklahoma Sooners in the NFL draft" and mapping
-- each pick to draft_year - 1 -- see that script's docstring and
-- lib/heisman-ledger/talent-scoring.ts for the round-1/2 (+6 each) and
-- round-3-7 (+2 each) scoring this feeds.

alter table heisman_ledger_seasons
  add column if not exists draft_picks_r1_2 smallint not null default 0,
  add column if not exists draft_picks_r3_7 smallint not null default 0,
  add column if not exists draft_picks_detail text not null default '';
