-- ─── Player prop lines, results, and team game stats ──────────────────────────
-- Run in Supabase SQL Editor.

create table if not exists player_prop_lines (
  id           uuid        primary key default gen_random_uuid(),
  player_name  text        not null,
  team_name    text        not null,
  game_date    date        not null,
  game_id      text,
  prop_type    text        not null,
  line         numeric     not null,
  over_odds    integer,
  under_odds   integer,
  source       text        default 'odds_api',
  created_at   timestamptz default now(),
  unique(player_name, game_date, prop_type)
);

create table if not exists player_prop_results (
  id           uuid        primary key default gen_random_uuid(),
  player_name  text        not null,
  team_name    text        not null,
  game_date    date        not null,
  prop_type    text        not null,
  line         numeric     not null,
  actual_value numeric     not null,
  result       text        not null,
  created_at   timestamptz default now(),
  unique(player_name, game_date, prop_type)
);

create table if not exists team_game_stats (
  id          uuid    primary key default gen_random_uuid(),
  team_name   text    not null,
  game_date   date    not null,
  hits        integer,
  home_runs   integer,
  runs        integer,
  strikeouts  integer,
  walks       integer,
  at_bats     integer,
  created_at  timestamptz default now(),
  unique(team_name, game_date)
);

create index if not exists player_prop_lines_player_idx   on player_prop_lines(player_name, prop_type);
create index if not exists player_prop_results_player_idx on player_prop_results(player_name, prop_type);
create index if not exists team_game_stats_team_idx       on team_game_stats(team_name, game_date);

alter table player_prop_lines   enable row level security;
alter table player_prop_results enable row level security;
alter table team_game_stats     enable row level security;

create policy "Public read player_prop_lines"   on player_prop_lines   for select using (true);
create policy "Public read player_prop_results" on player_prop_results for select using (true);
create policy "Public read team_game_stats"     on team_game_stats     for select using (true);
