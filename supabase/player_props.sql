-- ─── Raw game stats tables (MLB Stats API ingestion) ───────────────────────────
-- Run in Supabase SQL Editor.
--
-- Migration notes:
--   drop table if exists player_prop_lines;
--   alter table player_prop_results rename to player_game_stats;
--   -- then run the alter/add column statements below

-- Drop the prop lines table — no longer used (threshold comparison is UI-side)
drop table if exists player_prop_lines;

-- ─── player_game_stats ────────────────────────────────────────────────────────
-- One row per player per game per league per player_type (batter | pitcher).
-- Replaces player_prop_results. Stores raw stats only — no lines or results.

create table if not exists player_game_stats (
  id              uuid        primary key default gen_random_uuid(),
  player_name     text        not null,
  team_name       text        not null,
  game_date       date        not null,
  league          text        not null default 'MLB',
  player_type     text        not null default 'batter',  -- 'batter' | 'pitcher'
  hits            integer,
  home_runs       integer,
  rbis            integer,
  strikeouts      integer,
  walks           integer,
  at_bats         integer,
  innings_pitched numeric,
  earned_runs     integer,
  created_at      timestamptz default now(),
  unique(player_name, game_date, league, player_type)
);

create index if not exists player_game_stats_player_idx on player_game_stats(player_name, league, game_date desc);
create index if not exists player_game_stats_team_idx   on player_game_stats(team_name, game_date desc);

alter table player_game_stats enable row level security;
create policy "Public read player_game_stats" on player_game_stats for select using (true);

-- ─── team_game_stats ──────────────────────────────────────────────────────────
-- One row per team per game date. Extended with league, home/away, and opponent.

create table if not exists team_game_stats (
  id           uuid        primary key default gen_random_uuid(),
  team_name    text        not null,
  game_date    date        not null,
  league       text        not null default 'MLB',
  home_or_away text,                               -- 'home' | 'away'
  opponent     text,
  hits         integer,
  home_runs    integer,
  runs         integer,
  strikeouts   integer,
  walks        integer,
  at_bats      integer,
  created_at   timestamptz default now(),
  unique(team_name, game_date)
);

create index if not exists team_game_stats_team_idx on team_game_stats(team_name, game_date desc);

alter table team_game_stats enable row level security;
create policy "Public read team_game_stats" on team_game_stats for select using (true);
