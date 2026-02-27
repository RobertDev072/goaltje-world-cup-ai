
CREATE OR REPLACE TRIGGER recalculate_points_on_match_update
  AFTER UPDATE OF home_score, away_score, status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_match_points();
