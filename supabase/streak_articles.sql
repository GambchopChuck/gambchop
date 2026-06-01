-- Run in Supabase SQL Editor before first use
create table if not exists streak_articles (
  id               uuid        primary key default gen_random_uuid(),
  team_name        text        not null,
  league           text        not null,
  bet_type         text        not null,
  streak_length    integer     not null,
  streak_direction text        not null,
  headline         text        not null,
  body             text        not null,
  outcome_cells    jsonb       not null,
  generated_at     timestamptz default now()
);

-- One active article per team+bet_type; cron replaces on each run
create unique index if not exists streak_articles_team_bet_key
  on streak_articles (team_name, bet_type);

alter table streak_articles enable row level security;

drop policy if exists "streak_articles: public read" on streak_articles;
create policy "streak_articles: public read"
  on streak_articles for select using (true);
