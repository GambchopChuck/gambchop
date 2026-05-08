-- ═══════════════════════════════════════════════════════════════════════════════
-- Gambchop — Auth + RLS Migration (Steps 2.2 & 2.5)
-- Run this once in Supabase SQL Editor after schema.sql, community.sql,
-- and parlays.sql + migrate_to_favorites.sql have already been applied.
-- Safe to re-run: all statements use IF EXISTS / IF NOT EXISTS / ON CONFLICT.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. profiles table ────────────────────────────────────────────────────────
-- One row per auth.users entry. Tracks subscription tier.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  is_pro     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── 2. profiles RLS ──────────────────────────────────────────────────────────

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


-- ─── 3. favorite_groups RLS ───────────────────────────────────────────────────
-- user_id is uuid. App writes the Supabase auth UUID directly.

alter table favorite_groups enable row level security;

drop policy if exists "parlays_all"    on favorite_groups;
drop policy if exists "fg: select own" on favorite_groups;
drop policy if exists "fg: insert own" on favorite_groups;
drop policy if exists "fg: update own" on favorite_groups;
drop policy if exists "fg: delete own" on favorite_groups;

create policy "fg: select own"
  on favorite_groups for select using (user_id = auth.uid());

create policy "fg: insert own"
  on favorite_groups for insert with check (user_id = auth.uid());

create policy "fg: update own"
  on favorite_groups for update using (user_id = auth.uid());

create policy "fg: delete own"
  on favorite_groups for delete using (user_id = auth.uid());


-- ─── 4. favorite_items RLS ────────────────────────────────────────────────────
-- Access is derived from the parent favorite_group's user_id.

alter table favorite_items enable row level security;

drop policy if exists "parlay_legs_all" on favorite_items;
drop policy if exists "fi: select own"  on favorite_items;
drop policy if exists "fi: insert own"  on favorite_items;
drop policy if exists "fi: update own"  on favorite_items;
drop policy if exists "fi: delete own"  on favorite_items;

create policy "fi: select own"
  on favorite_items for select using (
    exists (select 1 from favorite_groups
            where id = favorite_group_id and user_id = auth.uid()));

create policy "fi: insert own"
  on favorite_items for insert with check (
    exists (select 1 from favorite_groups
            where id = favorite_group_id and user_id = auth.uid()));

create policy "fi: update own"
  on favorite_items for update using (
    exists (select 1 from favorite_groups
            where id = favorite_group_id and user_id = auth.uid()));

create policy "fi: delete own"
  on favorite_items for delete using (
    exists (select 1 from favorite_groups
            where id = favorite_group_id and user_id = auth.uid()));


-- ─── 5. community_threads RLS ─────────────────────────────────────────────────
-- Public read. INSERT requires authenticated Pro user.

alter table community_threads enable row level security;

drop policy if exists "threads_read"         on community_threads;
drop policy if exists "threads_insert"       on community_threads;
drop policy if exists "threads_update"       on community_threads;
drop policy if exists "threads: public read" on community_threads;
drop policy if exists "threads: insert pro"  on community_threads;
drop policy if exists "threads: update own"  on community_threads;
drop policy if exists "threads: delete own"  on community_threads;

create policy "threads: public read"
  on community_threads for select using (status != 'removed');

create policy "threads: insert pro"
  on community_threads for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()::text
    and exists (select 1 from public.profiles
                where id = auth.uid() and is_pro = true));

create policy "threads: update own"
  on community_threads for update using (user_id = auth.uid()::text);

create policy "threads: delete own"
  on community_threads for delete using (user_id = auth.uid()::text);


-- ─── 6. community_comments RLS ───────────────────────────────────────────────

alter table community_comments enable row level security;

drop policy if exists "comments_read"          on community_comments;
drop policy if exists "comments_insert"        on community_comments;
drop policy if exists "comments_update"        on community_comments;
drop policy if exists "comments: public read"  on community_comments;
drop policy if exists "comments: insert pro"   on community_comments;
drop policy if exists "comments: update own"   on community_comments;
drop policy if exists "comments: delete own"   on community_comments;

create policy "comments: public read"
  on community_comments for select using (is_deleted = false);

create policy "comments: insert pro"
  on community_comments for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()::text
    and exists (select 1 from public.profiles
                where id = auth.uid() and is_pro = true));

create policy "comments: update own"
  on community_comments for update using (user_id = auth.uid()::text);

create policy "comments: delete own"
  on community_comments for delete using (user_id = auth.uid()::text);


-- ─── 7. community_flags RLS ───────────────────────────────────────────────────

alter table community_flags enable row level security;

drop policy if exists "flags_insert"       on community_flags;
drop policy if exists "flags: insert auth" on community_flags;

create policy "flags: insert auth"
  on community_flags for insert
  with check (auth.uid() is not null and reporter_id = auth.uid()::text);


-- ─── 8. community_bans RLS ────────────────────────────────────────────────────

alter table community_bans enable row level security;

drop policy if exists "bans_read"       on community_bans;
drop policy if exists "bans: public read" on community_bans;

create policy "bans: public read"
  on community_bans for select using (true);
