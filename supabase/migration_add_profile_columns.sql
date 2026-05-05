-- ═══════════════════════════════════════════════════════════════════════════════
-- Gambchop — Step 2.1: Expand profiles table
-- Safe to run on a fresh DB (creates table) or existing DB (adds missing columns).
-- Run AFTER schema.sql and community.sql. Run BEFORE or INSTEAD OF
-- create_profiles.sql if you haven't run that yet.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Create table (no-op if it already exists) ────────────────────────────

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text,
  display_name        text,
  is_pro              boolean     not null default false,
  pro_since           timestamptz,
  pro_expires_at      timestamptz,
  stripe_customer_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── 2. Add columns that may be missing (idempotent) ─────────────────────────

alter table public.profiles
  add column if not exists email               text,
  add column if not exists display_name        text,
  add column if not exists pro_since           timestamptz,
  add column if not exists pro_expires_at      timestamptz,
  add column if not exists stripe_customer_id  text,
  add column if not exists updated_at          timestamptz default now();

-- ─── 3. updated_at trigger ───────────────────────────────────────────────────

create or replace function public.set_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profiles_updated_at();

-- ─── 4. Auto-create profile on signup (copies email + display_name) ──────────
-- display_name comes from options.data.display_name passed in supabase.auth.signUp()

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
    set email = excluded.email;   -- preserve existing display_name if already set
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 5. RLS (idempotent) ─────────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: select own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);
