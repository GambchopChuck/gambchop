-- ============================================================
-- Gambchop Schema
-- Run this in Supabase SQL Editor: paste and click Run
-- ============================================================

-- Drop trigger/function safely (handles case where table doesn't exist yet)
do $$ begin
  drop trigger if exists outcomes_updated_at on outcomes;
exception when undefined_table then null;
end $$;
drop function if exists update_updated_at();

-- MLB Teams
create table if not exists teams (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  abbreviation  text        not null unique,
  city          text        not null,
  league        text        not null check (league in ('AL', 'NL')),
  division      text        not null check (division in ('AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West')),
  logo_url      text,
  created_at    timestamptz not null default now()
);

-- MLB Games
create table if not exists games (
  id            uuid        primary key default gen_random_uuid(),
  home_team_id  uuid        not null references teams(id),
  away_team_id  uuid        not null references teams(id),
  game_date     date        not null,
  game_time     time,
  season        int         not null,
  status        text        not null default 'scheduled'
                            check (status in ('scheduled', 'in_progress', 'final', 'postponed')),
  home_score    int,
  away_score    int,
  venue         text,
  created_at    timestamptz not null default now()
);

-- Betting Outcomes
create table if not exists outcomes (
  id                  uuid        primary key default gen_random_uuid(),
  game_id             uuid        not null references games(id) on delete cascade,
  home_moneyline      int,
  away_moneyline      int,
  home_spread         numeric(4,1),
  away_spread         numeric(4,1),
  spread_juice        int         default -110,
  over_under          numeric(4,1),
  over_juice          int         default -110,
  under_juice         int         default -110,
  result              text        check (result in ('home_win', 'away_win', 'push')),
  -- Color-coded per market: 'win' = green, 'loss' = red, 'push' = yellow
  moneyline_result    text        check (moneyline_result in ('win', 'loss', 'push')),
  spread_result       text        check (spread_result in ('win', 'loss', 'push')),
  over_under_result   text        check (over_under_result in ('win', 'loss', 'push')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger outcomes_updated_at
  before update on outcomes
  for each row execute function update_updated_at();

-- Indexes
create index if not exists games_game_date_idx  on games(game_date);
create index if not exists games_season_idx     on games(season);
create index if not exists games_home_team_idx  on games(home_team_id);
create index if not exists games_away_team_idx  on games(away_team_id);
create index if not exists outcomes_game_id_idx on outcomes(game_id);

-- ============================================================
-- Row Level Security (required for anon key to read data)
-- ============================================================
alter table teams    enable row level security;
alter table games    enable row level security;
alter table outcomes enable row level security;

-- Drop policies before recreating (prevents conflict on re-runs)
drop policy if exists "teams: public read"    on teams;
drop policy if exists "games: public read"    on games;
drop policy if exists "outcomes: public read" on outcomes;

create policy "teams: public read"
  on teams for select using (true);

create policy "games: public read"
  on games for select using (true);

create policy "outcomes: public read"
  on outcomes for select using (true);

-- ============================================================
-- Seed all 30 MLB teams
-- ============================================================
insert into teams (name, abbreviation, city, league, division) values
  ('Arizona Diamondbacks',  'ARI', 'Phoenix',        'NL', 'NL West'),
  ('Atlanta Braves',        'ATL', 'Atlanta',         'NL', 'NL East'),
  ('Baltimore Orioles',     'BAL', 'Baltimore',       'AL', 'AL East'),
  ('Boston Red Sox',        'BOS', 'Boston',          'AL', 'AL East'),
  ('Chicago White Sox',     'CWS', 'Chicago',         'AL', 'AL Central'),
  ('Chicago Cubs',          'CHC', 'Chicago',         'NL', 'NL Central'),
  ('Cincinnati Reds',       'CIN', 'Cincinnati',      'NL', 'NL Central'),
  ('Cleveland Guardians',   'CLE', 'Cleveland',       'AL', 'AL Central'),
  ('Colorado Rockies',      'COL', 'Denver',          'NL', 'NL West'),
  ('Detroit Tigers',        'DET', 'Detroit',         'AL', 'AL Central'),
  ('Houston Astros',        'HOU', 'Houston',         'AL', 'AL West'),
  ('Kansas City Royals',    'KC',  'Kansas City',     'AL', 'AL Central'),
  ('Los Angeles Angels',    'LAA', 'Anaheim',         'AL', 'AL West'),
  ('Los Angeles Dodgers',   'LAD', 'Los Angeles',     'NL', 'NL West'),
  ('Miami Marlins',         'MIA', 'Miami',           'NL', 'NL East'),
  ('Milwaukee Brewers',     'MIL', 'Milwaukee',       'NL', 'NL Central'),
  ('Minnesota Twins',       'MIN', 'Minneapolis',     'AL', 'AL Central'),
  ('New York Yankees',      'NYY', 'New York',        'AL', 'AL East'),
  ('New York Mets',         'NYM', 'New York',        'NL', 'NL East'),
  ('Oakland Athletics',     'OAK', 'Oakland',         'AL', 'AL West'),
  ('Philadelphia Phillies', 'PHI', 'Philadelphia',    'NL', 'NL East'),
  ('Pittsburgh Pirates',    'PIT', 'Pittsburgh',      'NL', 'NL Central'),
  ('San Diego Padres',      'SD',  'San Diego',       'NL', 'NL West'),
  ('San Francisco Giants',  'SF',  'San Francisco',   'NL', 'NL West'),
  ('Seattle Mariners',      'SEA', 'Seattle',         'AL', 'AL West'),
  ('St. Louis Cardinals',   'STL', 'St. Louis',       'NL', 'NL Central'),
  ('Tampa Bay Rays',        'TB',  'St. Petersburg',  'AL', 'AL East'),
  ('Texas Rangers',         'TEX', 'Arlington',       'AL', 'AL West'),
  ('Toronto Blue Jays',     'TOR', 'Toronto',         'AL', 'AL East'),
  ('Washington Nationals',  'WSH', 'Washington',      'NL', 'NL East')
on conflict (abbreviation) do nothing;
