-- Fix prediction lock for nullable prediction_deadline_utc
-- When deadline is null, fallback to kickoff_utc - 1 hour.
CREATE OR REPLACE FUNCTION public.validate_prediction_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  effective_deadline timestamptz;
  match_status text;
BEGIN
  SELECT COALESCE(prediction_deadline_utc, kickoff_utc - INTERVAL '1 hour'), status
    INTO effective_deadline, match_status
  FROM public.matches
  WHERE id = NEW.match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Block if match is cancelled/void
  IF match_status IN ('cancelled', 'void') THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: wedstrijd is afgelast of ongeldig';
  END IF;

  -- Block if deadline has passed
  IF now() >= effective_deadline THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: deadline verstreken';
  END IF;

  RETURN NEW;
END;
$function$;
