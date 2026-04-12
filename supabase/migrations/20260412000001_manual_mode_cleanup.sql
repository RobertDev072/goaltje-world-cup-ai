-- ============================================================
-- Migration: Manual mode — remove API cron jobs, add constraints & functions
-- ============================================================

-- 1. Remove API-Football cron jobs (ignore errors if they don't exist)
DO $$ BEGIN
  PERFORM cron.unschedule('sync-live-scores');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('sync-fixtures-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('batch-wk-news-every-4h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Unique constraint on matches (prevents duplicate matches)
ALTER TABLE matches
  ADD CONSTRAINT IF NOT EXISTS unique_match
  UNIQUE(home_team_id, away_team_id, kickoff_utc);

-- 3. Prediction deadline trigger (1 hour before kickoff)
CREATE OR REPLACE FUNCTION check_prediction_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NOW() >= (
    SELECT COALESCE(prediction_deadline_utc, kickoff_utc - INTERVAL '1 hour')
    FROM matches WHERE id = NEW.match_id
  ) THEN
    RAISE EXCEPTION 'Deadline verlopen. Voorspelling kan niet meer worden ingediend.';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_prediction_deadline ON predictions;
CREATE TRIGGER enforce_prediction_deadline
  BEFORE INSERT OR UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION check_prediction_deadline();

-- 4. Fill default 0-0 predictions function
CREATE OR REPLACE FUNCTION fill_default_predictions()
RETURNS TABLE(inserted_count INTEGER) AS $$
DECLARE
  cnt INTEGER;
BEGIN
  WITH inserted AS (
    INSERT INTO predictions (user_id, pool_id, match_id, home_pred, away_pred)
    SELECT pm.user_id, pm.pool_id, m.id, 0, 0
    FROM pool_members pm
    CROSS JOIN matches m
    WHERE COALESCE(m.prediction_deadline_utc, m.kickoff_utc - INTERVAL '1 hour') <= NOW()
    AND NOT EXISTS (
      SELECT 1 FROM predictions p
      WHERE p.user_id = pm.user_id
      AND p.pool_id = pm.pool_id
      AND p.match_id = m.id
    )
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO cnt FROM inserted;
  RETURN QUERY SELECT cnt;
END; $$ LANGUAGE plpgsql;

-- 5. Early bird bonus column
ALTER TABLE pool_members
  ADD COLUMN IF NOT EXISTS early_bird_bonus INTEGER DEFAULT 0;

-- 6. Check early bird function
CREATE OR REPLACE FUNCTION check_early_bird()
RETURNS TABLE(users_awarded INTEGER) AS $$
DECLARE
  total_matches INTEGER;
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_matches FROM matches;

  WITH updated AS (
    UPDATE pool_members pm SET early_bird_bonus = 10
    WHERE early_bird_bonus = 0
    AND (
      SELECT COUNT(*) FROM predictions p
      WHERE p.user_id = pm.user_id
      AND p.pool_id = pm.pool_id
      AND p.created_at <= '2026-06-12T00:00:00+00'
    ) >= total_matches
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO cnt FROM updated;
  RETURN QUERY SELECT cnt;
END; $$ LANGUAGE plpgsql;

-- 7. Add expires_at column to pool_messages if it doesn't exist
DO $$ BEGIN
  ALTER TABLE pool_messages
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
    GENERATED ALWAYS AS (created_at + INTERVAL '5 minutes') STORED;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
