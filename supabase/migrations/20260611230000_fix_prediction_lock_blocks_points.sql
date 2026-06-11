-- ============================================================
-- KRITIEKE FIX: validate_prediction_lock blokkeerde de automatische
-- puntenberekening.
--
-- Probleem: recalculate_match_points() doet UPDATE predictions SET
-- points_awarded na een score-wijziging. Dat vuurde de lock-trigger,
-- die "deadline verstreken" gooide → de hele matches-update rolde
-- terug. Gevolg: live scores kwamen niet binnen en er werden geen
-- punten toegekend zodra een wedstrijd begonnen was.
--
-- Fix: de lock mag alleen een USER-wijziging van de voorspelling
-- (home_pred/away_pred) blokkeren na de deadline. System-updates die
-- enkel points_awarded zetten gaan altijd door.
-- ============================================================

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
  -- System-update (alleen points_awarded / metadata gewijzigd) → toestaan
  IF TG_OP = 'UPDATE' THEN
    IF NEW.home_pred IS NOT DISTINCT FROM OLD.home_pred
       AND NEW.away_pred IS NOT DISTINCT FROM OLD.away_pred THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT prediction_deadline_utc, status INTO match_deadline, match_status
  FROM public.matches WHERE id = NEW.match_id;

  IF match_deadline IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF match_status IN ('cancelled', 'void') THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: wedstrijd is afgelast of ongeldig';
  END IF;

  IF now() >= match_deadline THEN
    RAISE EXCEPTION 'Voorspellingen zijn gesloten: deadline verstreken';
  END IF;

  RETURN NEW;
END;
$function$;
