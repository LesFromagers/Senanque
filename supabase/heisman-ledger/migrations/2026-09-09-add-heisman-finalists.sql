-- Adds heisman_finalists and heisman_finalist_count to
-- heisman_ledger_seasons.
--
-- Why this file exists: schema.sql creates the table with
-- `create table if not exists`, so re-running it against a project where
-- the table ALREADY exists is a no-op and will NOT add these columns. If
-- you already ran schema.sql in this Supabase project before these
-- columns existed, run this migration before seed.sql -- otherwise every
-- insert fails with `column "heisman_finalists" of relation
-- "heisman_ledger_seasons" does not exist`. On a brand-new project,
-- schema.sql alone is enough and this file is a harmless no-op.
--
-- Unlike every other Wikipedia/CFBD/NCAA-sourced column in this table,
-- these two come from a small hand-supplied list
-- (data/heisman-ledger/heisman_finalists.csv) -- no automated source
-- carries Heisman finalist/voting data across OU's history (confirmed by
-- direct investigation: no per-year Wikipedia page exists, "List of
-- Heisman Trophy winners" only records the winner, and OU's own season
-- pages don't mention finalist status even for well-known near-misses).
-- A year absent from that CSV is a confirmed zero, not an unresolved gap,
-- so both columns default to 0 / '' rather than NULL.

alter table heisman_ledger_seasons
  add column if not exists heisman_finalists text not null default '',
  add column if not exists heisman_finalist_count smallint not null default 0;
