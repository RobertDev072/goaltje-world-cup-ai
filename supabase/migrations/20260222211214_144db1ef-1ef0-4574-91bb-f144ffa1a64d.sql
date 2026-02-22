
-- Create trigger to auto-recalculate points when match scores are updated
CREATE TRIGGER recalculate_points_on_match_update
AFTER UPDATE OF home_score, away_score ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_match_points();
