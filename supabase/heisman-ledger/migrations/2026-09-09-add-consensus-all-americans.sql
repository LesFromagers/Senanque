-- Adds consensus_all_americans and consensus_all_american_count to
-- heisman_ledger_seasons.
--
-- Why this file exists: schema.sql creates the table with
-- `create table if not exists`, so re-running it against a project where
-- the table ALREADY exists is a no-op and will NOT add these columns. If
-- you already ran schema.sql in this Supabase project before these
-- columns existed, run this migration before seed.sql -- otherwise every
-- insert fails with `column "consensus_all_americans" of relation
-- "heisman_ledger_seasons" does not exist`. On a brand-new project,
-- schema.sql alone is enough and this file is a harmless no-op.
--
-- These replace the old free-text notable_all_americans column as the
-- Talent layer's scoring input for All-Americans: notable_all_americans
-- was hand-entered prose with no consensus filtering and was found to
-- overcount relative to true NCAA-consensus status (e.g. 1950 lists 4
-- names, only 2 of which are real consensus selections). Populated by
-- scripts/heisman_ledger/pull_all_americans.py, reading each season's own
-- "{year} College Football All-America Team" Wikipedia page and filtering
-- for Oklahoma players meeting the NCAA's consensus threshold -- see that
-- script's docstring and lib/heisman-ledger/talent-scoring.ts.

alter table heisman_ledger_seasons
  add column if not exists consensus_all_americans text,
  add column if not exists consensus_all_american_count smallint;
