-- ─── Parlay Builder Schema ────────────────────────────────────────────────────

create table if not exists parlays (
  id         uuid default gen_random_uuid() primary key,
  user_id    text not null,
  name       text not null default 'My Parlay',
  status     text not null default 'active'
             check (status in ('active', 'complete')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists parlay_legs (
  id          uuid default gen_random_uuid() primary key,
  parlay_id   uuid references parlays(id) on delete cascade,
  team_name   text not null,
  league_id   text not null,
  league_name text not null,
  event_id    text not null,
  event_date  text not null,
  opponent    text not null default '',
  bet_type    text not null default 'moneyline'
              check (bet_type in ('moneyline', 'spread', 'over', 'under')),
  outcome     text not null default 'pending'
              check (outcome in ('pending', 'win', 'loss', 'push', 'over', 'under')),
  created_at  timestamptz default now()
);

create index if not exists idx_parlays_user_id       on parlays(user_id);
create index if not exists idx_parlay_legs_parlay_id on parlay_legs(parlay_id);

-- Auto-update updated_at on parlays
create or replace function update_parlays_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists parlays_updated_at on parlays;
create trigger parlays_updated_at
  before update on parlays
  for each row execute procedure update_parlays_updated_at();

-- RLS (demo app — permissive policies; tighten with real JWT auth)
alter table parlays     enable row level security;
alter table parlay_legs enable row level security;

create policy "parlays_all"     on parlays     for all using (true) with check (true);
create policy "parlay_legs_all" on parlay_legs for all using (true) with check (true);
