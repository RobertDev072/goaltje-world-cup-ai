
-- Drop any existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS recalculate_points_on_match_update ON public.matches;
DROP TRIGGER IF EXISTS recalculate_points_on_match_finish ON public.matches;
DROP TRIGGER IF EXISTS validate_prediction_lock ON public.predictions;

-- Create the recalculation trigger (BEFORE UPDATE so it can modify NEW)
CREATE TRIGGER recalculate_points_on_match_update
  BEFORE UPDATE OF home_score, away_score, status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_match_points();

-- Create the prediction lock trigger
CREATE TRIGGER validate_prediction_lock
  BEFORE INSERT OR UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prediction_lock();
