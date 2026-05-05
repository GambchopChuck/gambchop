-- ─── Migration: Rename parlay tables to favorites ─────────────────────────────
-- Run in Supabase SQL Editor. Safe to run on existing data — no rows are touched.

-- Step 1: Rename the child table first (it holds the FK)
ALTER TABLE parlay_legs   RENAME TO favorite_items;

-- Step 2: Rename the parent table
ALTER TABLE parlays        RENAME TO favorite_groups;

-- Step 3: Rename the foreign key column on favorite_items
ALTER TABLE favorite_items RENAME COLUMN parlay_id TO favorite_group_id;

-- Step 4: Rename indexes so they stay meaningful
ALTER INDEX IF EXISTS idx_parlays_user_id        RENAME TO idx_favorite_groups_user_id;
ALTER INDEX IF EXISTS idx_parlay_legs_parlay_id  RENAME TO idx_favorite_items_group_id;

-- Step 5: Rename RLS policies (drop old, re-create under new names)
DROP POLICY IF EXISTS "parlays_all"     ON favorite_groups;
DROP POLICY IF EXISTS "parlay_legs_all" ON favorite_items;

CREATE POLICY "favorite_groups_all" ON favorite_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "favorite_items_all"  ON favorite_items  FOR ALL USING (true) WITH CHECK (true);

-- Verification queries (run after migration to confirm)
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('favorite_groups','favorite_items');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'favorite_items' AND column_name = 'favorite_group_id';
