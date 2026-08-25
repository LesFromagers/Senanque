-- Adds the four CFBD season-total columns to heisman_ledger_seasons.
--
-- Why this file exists: schema.sql creates the table with
-- `create table if not exists`, so re-running it against a project where
-- the table ALREADY exists is a no-op and will NOT add these columns. If
-- you already ran schema.sql in this Supabase project before these
-- columns existed, run this migration before seed.sql — otherwise every
-- insert fails with `column "offense_total_yards" of relation
-- "heisman_ledger_seasons" does not exist`. On a brand-new project,
-- schema.sql alone is enough and this file is a harmless no-op.
--
-- Source: CFBD /stats/season, statNames totalYards / rushingYards /
-- netPassingYards / turnovers. Raw season totals, not per-game rates.
-- offense_turnovers is giveaways by OU's offense, not defensive takeaways.

alter table heisman_ledger_seasons
  add column if not exists offense_total_yards integer,
  add column if not exists offense_rushing_yards integer,
  add column if not exists offense_passing_yards integer,
  add column if not exists offense_turnovers integer;
