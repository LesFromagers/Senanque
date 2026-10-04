-- ASFC Scouting Radar — schema (see ASFC_SCOUTING_RADAR.md)
--
-- Run once in the Supabase SQL Editor. Idempotent: safe to re-run.
-- Tables are prefixed `scouting_` because they share a Supabase project with
-- the Heisman Park Ledger. Spec name -> table:
--   dim_player -> scouting_dim_player            dim_league -> scouting_dim_league
--   dim_team   -> scouting_dim_team              dim_season -> scouting_dim_season
--   player_source_mapping -> scouting_player_source_mapping
--   fact_player_season_stats -> scouting_fact_player_season_stats
--   fact_player_percentiles  -> scouting_fact_player_percentiles
--
-- Security (CLAUDE.md checklist): RLS is ON for every table. Public
-- (anon/authenticated) get SELECT-only on the dim/fact tables via an explicit
-- policy AND an explicit GRANT (this project has "automatically expose new
-- tables" turned off). ETL bookkeeping tables get RLS and NO public policy or
-- grant at all. There is no insert/update/delete policy for any public role;
-- writes happen only with the service-role key, run locally by the owner.
--
-- Stat columns are mapped from API-Football's /players `statistics[]` block.
-- Every stat is NULLable on purpose: the API returns null for "not recorded",
-- and null must never be coerced to 0 (it would drag percentiles down).
-- Verify column coverage against the first real cached response
-- (scripts/etl/probe.py) before backfilling.

-- ---------------------------------------------------------------- dimensions

create table if not exists scouting_dim_player (
  player_id   bigint generated always as identity primary key,
  full_name   text not null,
  birth_date  date,
  nationality text
);

-- v1 has one source (api_football). Kept so a second source can be added
-- later: match on normalized name + birth date + nationality, flag anything
-- ambiguous via needs_review, never silently guess.
create table if not exists scouting_player_source_mapping (
  player_id        bigint not null references scouting_dim_player (player_id),
  source           text not null,
  source_player_id text not null,
  needs_review     boolean not null default false,
  notes            text,
  unique (source, source_player_id)
);
create index if not exists scouting_psm_player_idx
  on scouting_player_source_mapping (player_id);

-- league_id / team_id are API-Football's own ids (stable, and the pull is
-- keyed by them).
create table if not exists scouting_dim_league (
  league_id integer primary key,
  name      text not null,
  country   text
);

create table if not exists scouting_dim_team (
  team_id integer primary key,
  name    text not null
);

create table if not exists scouting_dim_season (
  season     integer primary key,          -- start year, e.g. 2024
  label      text not null,                -- e.g. '2024/25'
  is_current boolean not null default false
);
-- At most one current season.
create unique index if not exists scouting_dim_season_one_current
  on scouting_dim_season (is_current) where is_current;

-- -------------------------------------------------------------------- facts

-- Grain: player + season + league + team. Domestic league rows only (cups and
-- European competitions are filtered out by the ETL). A player who moved
-- clubs mid-season has several rows; they are aggregated at percentile time.
create table if not exists scouting_fact_player_season_stats (
  player_id bigint  not null references scouting_dim_player (player_id),
  season    integer not null references scouting_dim_season (season),
  league_id integer not null references scouting_dim_league (league_id),
  team_id   integer not null references scouting_dim_team (team_id),

  position            text,      -- Goalkeeper | Defender | Midfielder | Attacker
  appearances         integer,   -- API field: games.appearences (sic)
  starts              integer,   -- games.lineups
  minutes             integer,   -- games.minutes
  rating              numeric,   -- games.rating (API-Football's own; display only)

  goals               integer,   -- goals.total
  assists             integer,   -- goals.assists
  shots               integer,   -- shots.total
  shots_on_target     integer,   -- shots.on

  passes              integer,   -- passes.total
  key_passes          integer,   -- passes.key
  -- passes.accuracy as returned. Its meaning (accurate-pass count vs. a
  -- percentage) must be confirmed from a real response before the percentile
  -- step uses it; stored verbatim until then.
  passes_accuracy_raw integer,

  tackles             integer,   -- tackles.total
  blocks              integer,   -- tackles.blocks
  interceptions       integer,   -- tackles.interceptions

  duels               integer,   -- duels.total
  duels_won           integer,   -- duels.won
  dribbles_attempted  integer,   -- dribbles.attempts
  dribbles_successful integer,   -- dribbles.success

  fouls_drawn         integer,   -- fouls.drawn
  fouls_committed     integer,   -- fouls.committed
  yellow_cards        integer,   -- cards.yellow
  yellowred_cards     integer,   -- cards.yellowred
  red_cards           integer,   -- cards.red

  updated_at timestamptz not null default now(),
  primary key (player_id, season, league_id, team_id)
);
create index if not exists scouting_fpss_season_idx
  on scouting_fact_player_season_stats (season, league_id);

-- Precomputed by the percentile step (never computed per page load). Long
-- format: one row per player + season + metric.
create table if not exists scouting_fact_player_percentiles (
  player_id      bigint  not null references scouting_dim_player (player_id),
  season         integer not null references scouting_dim_season (season),
  position_group text    not null check (position_group in ('Defender','Midfielder','Attacker')),
  metric         text    not null,
  value_per90    double precision,
  percentile     double precision,
  pool_size      integer,
  computed_at    timestamptz not null default now(),
  primary key (player_id, season, metric)
);
create index if not exists scouting_fpp_pool_idx
  on scouting_fact_player_percentiles (season, position_group, metric);

-- ------------------------------------------------------------ ETL bookkeeping

-- One row per real HTTP request to API-Football (cache hits are not logged).
-- The daily cap is enforced by counting today's (UTC) rows here.
create table if not exists scouting_etl_request_ledger (
  id                 bigint generated always as identity primary key,
  requested_at       timestamptz not null default now(),
  endpoint           text not null,
  params             jsonb,
  http_status        integer,
  api_errors         jsonb,
  requests_remaining integer     -- x-ratelimit-requests-remaining header, if sent
);
create index if not exists scouting_etl_ledger_time_idx
  on scouting_etl_request_ledger (requested_at);

-- Per league + season + page progress, so a stopped run resumes.
create table if not exists scouting_etl_page_progress (
  league_id   integer not null,
  season      integer not null,
  page        integer not null,
  total_pages integer,
  status      text not null check (status in ('fetched','loaded','error')),
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (league_id, season, page)
);

-- ----------------------------------------------------------------- security

alter table scouting_dim_player                enable row level security;
alter table scouting_player_source_mapping     enable row level security;
alter table scouting_dim_league                enable row level security;
alter table scouting_dim_team                  enable row level security;
alter table scouting_dim_season                enable row level security;
alter table scouting_fact_player_season_stats  enable row level security;
alter table scouting_fact_player_percentiles   enable row level security;
alter table scouting_etl_request_ledger        enable row level security;
alter table scouting_etl_page_progress         enable row level security;

-- Read-only public policy + grant on the tables the website reads.
-- player_source_mapping is internal (needs_review notes) and stays closed.
do $$
declare t text;
begin
  foreach t in array array[
    'scouting_dim_player',
    'scouting_dim_league',
    'scouting_dim_team',
    'scouting_dim_season',
    'scouting_fact_player_season_stats',
    'scouting_fact_player_percentiles'
  ] loop
    execute format('drop policy if exists "Public read access" on %I', t);
    execute format('create policy "Public read access" on %I for select using (true)', t);
    execute format('grant select on %I to anon, authenticated', t);
  end loop;
end $$;

-- Explicitly closed to public roles (service role bypasses RLS):
revoke all on scouting_player_source_mapping from anon, authenticated;
revoke all on scouting_etl_request_ledger    from anon, authenticated;
revoke all on scouting_etl_page_progress     from anon, authenticated;
