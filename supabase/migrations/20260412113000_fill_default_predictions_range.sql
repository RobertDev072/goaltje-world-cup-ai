-- Add safer default predictions function with pool + date range guard
CREATE OR REPLACE FUNCTION fill_default_predictions_for_range(
  p_pool_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(inserted_count INTEGER) AS $$
DECLARE
  cnt INTEGER;
BEGIN
  IF p_pool_id IS NULL THEN
    RAISE EXCEPTION 'pool_id is required';
  END IF;
  IF p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION 'from/to are required';
  END IF;

  WITH inserted AS (
    INSERT INTO predictions (user_id, pool_id, match_id, home_pred, away_pred)
    SELECT pm.user_id, pm.pool_id, m.id, 0, 0
    FROM pool_members pm
    JOIN matches m ON TRUE
    WHERE pm.pool_id = p_pool_id
      AND m.kickoff_utc BETWEEN p_from AND p_to
      AND COALESCE(m.prediction_deadline_utc, m.kickoff_utc - INTERVAL '1 hour') <= NOW()
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

