-- Migration: add odds_api_id column to games
-- games.external_id is now always gamePk (integer string, official MLB source).
-- odds_api_id stores the Odds API UUID when available, for cross-referencing only.

ALTER TABLE games ADD COLUMN IF NOT EXISTS odds_api_id text;

CREATE UNIQUE INDEX IF NOT EXISTS games_odds_api_id_idx
  ON games(odds_api_id)
  WHERE odds_api_id IS NOT NULL;

-- Delete smoke-test row(s) inserted with an Odds API UUID as external_id.
-- Odds API UUIDs contain hyphens (e.g. "abc12345-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
-- gamePk values are pure integers ("746123"). The LIKE '%-% ' filter is unambiguous.
-- These rows will be re-ingested correctly via gamePk on the next backfill run.
DELETE FROM games
WHERE league_id = (SELECT id FROM leagues WHERE slug = 'mlb')
  AND external_id LIKE '%-%';
