-- Remove fill_default_predictions functions
-- Missed predictions automatically count as 0 pts — no 0-0 row insertion needed.
-- calculatePoints() in src/lib/scoring.ts already returns 0 for null predictions.

DROP FUNCTION IF EXISTS fill_default_predictions();
DROP FUNCTION IF EXISTS fill_default_predictions_for_range(uuid, timestamptz, timestamptz);
