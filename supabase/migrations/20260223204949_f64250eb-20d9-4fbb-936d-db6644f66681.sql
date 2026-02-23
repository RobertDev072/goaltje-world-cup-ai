-- Create trigger to auto-recalculate points when match scores are updated
CREATE OR REPLACE TRIGGER recalculate_points_on_match_update
  AFTER UPDATE OF home_score, away_score, status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_match_points();

-- Also allow pool_members UPDATE for rival feature (user can update own row)
CREATE POLICY "Members can update own membership"
  ON public.pool_members
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);