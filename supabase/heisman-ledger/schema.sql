-- The Heisman Park Ledger — Supabase schema
--
-- Run this in the Supabase SQL Editor once the project exists, then run
-- seed.sql. Per CLAUDE.md's security checklist: RLS is turned on
-- explicitly below and given an explicit read-only policy — nothing here
-- is left open by default, and there is no insert/update/delete policy
-- for the anon role, so writes only ever happen with the service-role key
-- (locally, or from a script — never from a browser).

create table if not exists heisman_ledger_seasons (
  year integer primary key,
  head_coach text,
  conference text,
  final_record text,
  final_ap_rank text,
  national_title_claim text,
  points_for integer,
  points_for_is_approximate boolean not null default false,
  points_against integer,
  points_against_is_approximate boolean not null default false,
  -- 'TRUE' | 'FALSE' | 'SPLIT (...)' | 'N/A (not on schedule)' — kept as
  -- free text rather than a plain boolean because "not on the schedule
  -- that year" and "split result" are both real, distinct states the
  -- Power Index tiebreaker needs to tell apart from a clean loss.
  beat_texas text,
  beat_osu text,
  heisman_winner text,
  notable_all_americans text,
  data_tier smallint not null check (data_tier between 1 and 4),
  source_notes text not null default '',
  offense_ppa double precision,
  defense_ppa double precision,
  offense_success_rate double precision,
  defense_success_rate double precision,
  sp_overall double precision,
  sp_offense double precision,
  sp_defense double precision,
  -- Raw season counting stats (api/stats/season, 2005+), OU's own offensive
  -- output only. No matching "yards allowed" column — CFBD's season-stats
  -- endpoint doesn't split by offense/defense, so a real defensive-yardage
  -- figure isn't available without a per-opponent reconciliation this
  -- pipeline doesn't do. defense_ppa above is the actual defensive-quality
  -- figure the Power Index uses; these four are supplementary context.
  offense_total_yards integer,
  offense_rushing_yards integer,
  offense_passing_yards integer,
  offense_turnovers integer,
  -- Iterative-SRS opponent-adjusted margin. NULL until the second-order
  -- opponent-season pull exists — see gap_report_verified_batch.md's "Not
  -- started at all" section. Never fabricated in its place.
  sos_adjusted_margin double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists heisman_ledger_games (
  id bigint generated always as identity primary key,
  year integer not null references heisman_ledger_seasons(year) on delete cascade,
  game_order smallint not null,
  date text,
  opponent text,
  site_text text,
  -- 'home' | 'away' | 'neutral' | 'unknown' — a parser heuristic
  -- (scripts/heisman_ledger/pull_wikipedia.py), never asserted as a
  -- verified fact. See that script's _guess_home_away() docstring.
  home_away_guess text not null default 'unknown',
  result text, -- 'W' | 'L' | 'T' | null
  team_score integer,
  opp_score integer,
  notes text not null default '',
  unique (year, game_order)
);

create index if not exists heisman_ledger_games_year_idx on heisman_ledger_games (year);

alter table heisman_ledger_seasons enable row level security;
alter table heisman_ledger_games enable row level security;

drop policy if exists "Public read access" on heisman_ledger_seasons;
create policy "Public read access" on heisman_ledger_seasons
  for select
  using (true);

drop policy if exists "Public read access" on heisman_ledger_games;
create policy "Public read access" on heisman_ledger_games
  for select
  using (true);

-- Keeps updated_at honest on every UPDATE, so "when was this row last
-- corrected" is answerable without trusting whoever ran the update to
-- remember to set it themselves.
create or replace function heisman_ledger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists heisman_ledger_seasons_updated_at on heisman_ledger_seasons;
create trigger heisman_ledger_seasons_updated_at
  before update on heisman_ledger_seasons
  for each row
  execute function heisman_ledger_set_updated_at();
