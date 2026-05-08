-- ─── Gambchop — Full RLS Policy Lockdown ──────────────────────────────────────
-- Run AFTER schema.sql, community.sql, parlays.sql + migrate_to_favorites.sql,
-- and create_profiles.sql.
--
-- Note: favorite_groups/favorite_items store user_id as UUID (matches auth.uid()).
-- community_threads, community_comments store user_id as TEXT — those policies
-- keep the ::text cast. Old community rows with generated IDs won't match
-- auth.uid()::text and are grandfathered read-only until a community migration.


-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Already set in create_profiles.sql; this block is idempotent.

alter table public.profiles enable row level security;

drop policy if exists "profiles: select own"  on public.profiles;
drop policy if exists "profiles: insert own"  on public.profiles;
drop policy if exists "profiles: update own"  on public.profiles;

create policy "profiles: select own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);


-- ─── favorite_groups ──────────────────────────────────────────────────────────

alter table favorite_groups enable row level security;

drop policy if exists "parlays_all"      on favorite_groups;
drop policy if exists "fg: select own"   on favorite_groups;
drop policy if exists "fg: insert own"   on favorite_groups;
drop policy if exists "fg: update own"   on favorite_groups;
drop policy if exists "fg: delete own"   on favorite_groups;

create policy "fg: select own"
  on favorite_groups for select using (user_id = auth.uid());

create policy "fg: insert own"
  on favorite_groups for insert with check (user_id = auth.uid());

create policy "fg: update own"
  on favorite_groups for update using (user_id = auth.uid());

create policy "fg: delete own"
  on favorite_groups for delete using (user_id = auth.uid());


-- ─── favorite_items ───────────────────────────────────────────────────────────

alter table favorite_items enable row level security;

drop policy if exists "parlay_legs_all" on favorite_items;
drop policy if exists "fi: select own"  on favorite_items;
drop policy if exists "fi: insert own"  on favorite_items;
drop policy if exists "fi: update own"  on favorite_items;
drop policy if exists "fi: delete own"  on favorite_items;

create policy "fi: select own"
  on favorite_items for select using (
    exists (
      select 1 from favorite_groups
      where id = favorite_group_id
        and user_id = auth.uid()
    )
  );

create policy "fi: insert own"
  on favorite_items for insert with check (
    exists (
      select 1 from favorite_groups
      where id = favorite_group_id
        and user_id = auth.uid()
    )
  );

create policy "fi: update own"
  on favorite_items for update using (
    exists (
      select 1 from favorite_groups
      where id = favorite_group_id
        and user_id = auth.uid()
    )
  );

create policy "fi: delete own"
  on favorite_items for delete using (
    exists (
      select 1 from favorite_groups
      where id = favorite_group_id
        and user_id = auth.uid()
    )
  );


-- ─── community_threads ────────────────────────────────────────────────────────

alter table community_threads enable row level security;

-- Drop old permissive policies
drop policy if exists "threads_read"    on community_threads;
drop policy if exists "threads_insert"  on community_threads;
drop policy if exists "threads_update"  on community_threads;
drop policy if exists "threads: insert pro"   on community_threads;
drop policy if exists "threads: update own"   on community_threads;
drop policy if exists "threads: delete own"   on community_threads;
drop policy if exists "threads: public read"  on community_threads;

-- Public read: anyone (even anon) can read approved threads
create policy "threads: public read"
  on community_threads for select
  using (status != 'removed');

-- Insert: must be logged in AND Pro (is_pro checked in profiles)
create policy "threads: insert pro"
  on community_threads for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_pro = true
    )
  );

-- Update: author only (status, title, content edits)
create policy "threads: update own"
  on community_threads for update
  using (user_id = auth.uid()::text);

-- Delete: author only
create policy "threads: delete own"
  on community_threads for delete
  using (user_id = auth.uid()::text);


-- ─── community_comments ───────────────────────────────────────────────────────

alter table community_comments enable row level security;

drop policy if exists "comments_read"   on community_comments;
drop policy if exists "comments_insert" on community_comments;
drop policy if exists "comments_update" on community_comments;
drop policy if exists "comments: public read"  on community_comments;
drop policy if exists "comments: insert pro"   on community_comments;
drop policy if exists "comments: update own"   on community_comments;
drop policy if exists "comments: delete own"   on community_comments;

create policy "comments: public read"
  on community_comments for select
  using (is_deleted = false);

create policy "comments: insert pro"
  on community_comments for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_pro = true
    )
  );

create policy "comments: update own"
  on community_comments for update
  using (user_id = auth.uid()::text);

create policy "comments: delete own"
  on community_comments for delete
  using (user_id = auth.uid()::text);


-- ─── community_flags ─────────────────────────────────────────────────────────

alter table community_flags enable row level security;

drop policy if exists "flags_insert" on community_flags;
drop policy if exists "flags: insert auth" on community_flags;
drop policy if exists "flags: read mod"    on community_flags;

-- Authenticated users can flag content
create policy "flags: insert auth"
  on community_flags for insert
  with check (auth.uid() is not null and reporter_id = auth.uid()::text);

-- Mods read via service role (dashboard); anon cannot read flags
-- No select policy = no anon reads (RLS blocks by default)


-- ─── community_bans ──────────────────────────────────────────────────────────

alter table community_bans enable row level security;

drop policy if exists "bans_read" on community_bans;

-- Anyone can check if they're banned (used in app to block posting)
create policy "bans: public read"
  on community_bans for select
  using (true);

-- Bans are written only by mods via the Supabase dashboard (service role)
