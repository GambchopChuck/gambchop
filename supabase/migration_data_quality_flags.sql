-- ─── Data quality flags ──────────────────────────────────────────────────────
-- Stores per-game validation failures detected by the nightly validate-outcomes
-- cron. Admin-only — no public RLS policy. Query directly in Supabase Studio.
-- Resolving a flag: set resolved_at = now(), auto_resolved = false (manual)
--                or set resolved_at = now(), auto_resolved = true  (re-ingested)

create table public.data_quality_flags (
  id            uuid        default gen_random_uuid() primary key,
  game_id       uuid        references games(id) on delete cascade not null,
  flag_type     text        not null,
  detected_at   timestamptz default now() not null,
  resolved_at   timestamptz,
  auto_resolved boolean     default false not null,
  notes         text
);

create index data_quality_flags_game_id_idx  on public.data_quality_flags (game_id);
create index data_quality_flags_resolved_idx on public.data_quality_flags (resolved_at);

alter table public.data_quality_flags enable row level security;

-- No public policy — access via supabaseAdmin (service role) only.
