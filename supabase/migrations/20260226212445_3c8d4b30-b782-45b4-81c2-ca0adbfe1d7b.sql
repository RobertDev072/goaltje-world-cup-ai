-- Update recalculate_match_points to handle resets (NULL scores → reset points to 0)
CREATE OR REPLACE FUNCTION public.recalculate_match_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pred RECORD;
  pool_rules jsonb;
  pts integer;
  pred_diff integer;
  actual_diff integer;
  pred_result integer;
  actual_result integer;
BEGIN
  -- If scores are cleared (match reset), set all prediction points to 0
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
    UPDATE public.predictions SET points_awarded = 0 WHERE match_id = NEW.id;
    RETURN NEW;
  END IF;

  FOR pred IN
    SELECT p.id, p.home_pred, p.away_pred, p.pool_id
    FROM public.predictions p
    WHERE p.match_id = NEW.id
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
  LOOP
    SELECT scoring_rules_json INTO pool_rules
    FROM public.pools WHERE id = pred.pool_id;

    pts := 0;

    IF pred.home_pred = NEW.home_score AND pred.away_pred = NEW.away_score THEN
      pts := COALESCE((pool_rules->>'exact')::integer, 5);
    ELSE
      pred_diff := pred.home_pred - pred.away_pred;
      actual_diff := NEW.home_score - NEW.away_score;
      pred_result := SIGN(pred_diff);
      actual_result := SIGN(actual_diff);

      IF pred_result = actual_result THEN
        pts := COALESCE((pool_rules->>'result')::integer, 3);
        IF COALESCE((pool_rules->>'goal_diff')::integer, 0) > 0 AND pred_diff = actual_diff THEN
          pts := pts + (pool_rules->>'goal_diff')::integer;
        END IF;
      END IF;
    END IF;

    UPDATE public.predictions SET points_awarded = pts WHERE id = pred.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS recalculate_points_on_match_update ON public.matches;
CREATE TRIGGER recalculate_points_on_match_update
  AFTER UPDATE OF home_score, away_score, status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_match_points();