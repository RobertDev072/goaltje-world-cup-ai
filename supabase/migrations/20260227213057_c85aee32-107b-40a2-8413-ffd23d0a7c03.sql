
-- 1. Add new columns to matches
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS prediction_deadline_utc timestamptz,
  ADD COLUMN IF NOT EXISTS needs_recalc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_calculated_at timestamptz;

-- 2. Backfill prediction_deadline_utc = kickoff_utc for all existing matches
UPDATE public.matches SET prediction_deadline_utc = kickoff_utc WHERE prediction_deadline_utc IS NULL;

-- 3. Make prediction_deadline_utc NOT NULL after backfill
ALTER TABLE public.matches ALTER COLUMN prediction_deadline_utc SET NOT NULL;
ALTER TABLE public.matches ALTER COLUMN prediction_deadline_utc SET DEFAULT now();

-- 4. Update validate_prediction_lock to use deadline instead of status
CREATE OR REPLACE FUNCTION public.validate_prediction_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  match_deadline timestamptz;
  match_status text;
BEGIN
  SELECT prediction_deadline_utc, status INTO match_deadline, match_status
  FROM public.matches WHERE id = NEW.match_id;

  IF match_deadline IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Block if match is cancelled/void
  IF match_status IN ('cancelled', 'void') THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: wedstrijd is afgelast of ongeldig';
  END IF;

  -- Block if deadline has passed
  IF now() >= match_deadline THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: deadline verstreken';
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Update recalculate_match_points to set needs_recalc + points_calculated_at
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
  -- Mark as needing recalc
  NEW.needs_recalc := true;

  -- For cancelled/void/postponed or NULL scores: reset all points to 0
  IF NEW.status IN ('cancelled', 'void', 'postponed') OR NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
    UPDATE public.predictions SET points_awarded = 0 WHERE match_id = NEW.id;
    NEW.needs_recalc := false;
    NEW.points_calculated_at := now();
    RETURN NEW;
  END IF;

  -- Only recalculate if status is finished (or live for partial)
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
      pts := COALESCE((pool_rules->>'exact')::integer, 6);
    ELSE
      pred_diff := pred.home_pred - pred.away_pred;
      actual_diff := NEW.home_score - NEW.away_score;
      pred_result := SIGN(pred_diff);
      actual_result := SIGN(actual_diff);

      IF pred_result = actual_result THEN
        IF pred_diff = actual_diff THEN
          pts := COALESCE((pool_rules->>'goal_diff')::integer, 4);
        ELSE
          pts := COALESCE((pool_rules->>'result')::integer, 3);
        END IF;
      END IF;
    END IF;

    UPDATE public.predictions SET points_awarded = pts WHERE id = pred.id;
  END LOOP;

  NEW.needs_recalc := false;
  NEW.points_calculated_at := now();
  RETURN NEW;
END;
$function$;

-- 6. Drop old trigger if exists and recreate as BEFORE UPDATE (so we can modify NEW)
DROP TRIGGER IF EXISTS recalculate_points_on_match_update ON public.matches;

CREATE TRIGGER recalculate_points_on_match_update
  BEFORE UPDATE OF home_score, away_score, status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_match_points();
