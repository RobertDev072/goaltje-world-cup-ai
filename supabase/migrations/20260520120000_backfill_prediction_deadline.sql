-- ============================================================
-- Backfill prediction_deadline_utc voor matches uit de Q&B sync
--
-- De sync-wc2026 edge function vulde aanvankelijk alleen kickoff_utc.
-- save_prediction_bulk checkt prediction_deadline_utc en gooide
-- "Match not found" als die NULL was → gebruikers konden niet
-- voorspellen. Deadline = kickoff (voorspellen kan tot de aftrap).
--
-- De edge function zet dit veld inmiddels zelf bij elke upsert; deze
-- migration is de eenmalige backfill voor bestaande rijen.
-- ============================================================

UPDATE public.matches
   SET prediction_deadline_utc = kickoff_utc
 WHERE prediction_deadline_utc IS NULL
   AND kickoff_utc IS NOT NULL;
