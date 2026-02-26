
-- 1. Update default scoring rules for new pools
ALTER TABLE public.pools ALTER COLUMN scoring_rules_json SET DEFAULT '{"exact": 6, "result": 3, "goal_diff": 4}'::jsonb;

-- 2. Update the trigger function with new scoring logic and status handling
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
  -- For cancelled/void/postponed: reset all points to 0
  IF NEW.status IN ('cancelled', 'void', 'postponed') OR NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
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

    -- Exact score: highest priority, no stacking
    IF pred.home_pred = NEW.home_score AND pred.away_pred = NEW.away_score THEN
      pts := COALESCE((pool_rules->>'exact')::integer, 6);
    ELSE
      pred_diff := pred.home_pred - pred.away_pred;
      actual_diff := NEW.home_score - NEW.away_score;
      pred_result := SIGN(pred_diff);
      actual_result := SIGN(actual_diff);

      IF pred_result = actual_result THEN
        -- Correct goal difference (but not exact): 4 pts
        IF pred_diff = actual_diff THEN
          pts := COALESCE((pool_rules->>'goal_diff')::integer, 4);
        ELSE
          -- Only correct result: 3 pts
          pts := COALESCE((pool_rules->>'result')::integer, 3);
        END IF;
      END IF;
    END IF;

    UPDATE public.predictions SET points_awarded = pts WHERE id = pred.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 3. Server-side prediction locking
CREATE OR REPLACE FUNCTION public.validate_prediction_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  match_kickoff timestamptz;
  match_status text;
BEGIN
  SELECT kickoff_utc, status INTO match_kickoff, match_status
  FROM public.matches WHERE id = NEW.match_id;

  IF match_kickoff IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF match_status <> 'scheduled' THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: wedstrijd is niet meer gepland';
  END IF;

  IF now() >= match_kickoff THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: wedstrijd is al begonnen';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_prediction_lock ON public.predictions;
CREATE TRIGGER enforce_prediction_lock
  BEFORE INSERT OR UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prediction_lock();
