-- ─── Gambchop Community Board Migration ──────────────────────────────────────
-- Run this in your Supabase SQL Editor to enable the community board.

-- Threads
CREATE TABLE IF NOT EXISTS community_threads (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text NOT NULL,
  username    text NOT NULL,
  title       text NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 120),
  content     text NOT NULL CHECK (char_length(content) >= 20 AND char_length(content) <= 2000),
  tags        text[] DEFAULT '{}',
  status      text DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'removed')),
  reply_count integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS community_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id   uuid REFERENCES community_threads(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  username    text NOT NULL,
  content     text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  upvotes     integer DEFAULT 0,
  downvotes   integer DEFAULT 0,
  is_pinned   boolean DEFAULT false,
  is_deleted  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Flags / reports
CREATE TABLE IF NOT EXISTS community_flags (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id   text NOT NULL,
  target_type   text NOT NULL CHECK (target_type IN ('thread', 'comment')),
  target_id     uuid NOT NULL,
  reason        text NOT NULL,
  resolved      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Bans (mod use — set via dashboard or future mod UI)
CREATE TABLE IF NOT EXISTS community_bans (
  user_id     text PRIMARY KEY,
  reason      text,
  banned_at   timestamptz DEFAULT now()
);

-- ─── Auto-update updated_at on threads ───────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS threads_updated_at  ON community_threads;
DROP TRIGGER IF EXISTS comments_updated_at ON community_comments;

CREATE TRIGGER threads_updated_at
  BEFORE UPDATE ON community_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Auto-increment reply_count when comment added ────────────────────────────

CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS trigger AS $$
BEGIN
  UPDATE community_threads
  SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_inserted ON community_comments;
CREATE TRIGGER on_comment_inserted
  AFTER INSERT ON community_comments
  FOR EACH ROW EXECUTE FUNCTION increment_reply_count();

-- Auto-decrement on soft-delete
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    UPDATE community_threads
    SET reply_count = GREATEST(0, reply_count - 1), updated_at = now()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_deleted ON community_comments;
CREATE TRIGGER on_comment_deleted
  AFTER UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_reply_count();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE community_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_flags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bans     ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "threads_read"   ON community_threads  FOR SELECT USING (status != 'removed');
CREATE POLICY "comments_read"  ON community_comments FOR SELECT USING (is_deleted = false);

-- Anyone (anon) can insert — user identity validated client-side for MVP
CREATE POLICY "threads_insert"  ON community_threads  FOR INSERT WITH CHECK (true);
CREATE POLICY "comments_insert" ON community_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "flags_insert"    ON community_flags    FOR INSERT WITH CHECK (true);

-- Updates allowed (vote counts, soft deletes, edits)
CREATE POLICY "threads_update"  ON community_threads  FOR UPDATE USING (true);
CREATE POLICY "comments_update" ON community_comments FOR UPDATE USING (true);

-- Bans: read-only for anon
CREATE POLICY "bans_read" ON community_bans FOR SELECT USING (true);
