
-- 1) API cache table for rate-limited external API calls
CREATE TABLE public.api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL
);
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "API cache is readable by all" ON public.api_cache FOR SELECT USING (true);

-- 2) Daily API request counter
CREATE TABLE public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_date date UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "API usage readable by admins" ON public.api_usage FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- 3) Allow admins to update matches (scores, status)
CREATE POLICY "Admins can update matches"
ON public.matches FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 4) Allow admins to insert matches
CREATE POLICY "Admins can insert matches"
ON public.matches FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5) Automatic points calculation trigger
CREATE OR REPLACE FUNCTION public.recalculate_match_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pred RECORD;
  pool_rules jsonb;
  pts integer;
  pred_diff integer;
  actual_diff integer;
  pred_result integer;
  actual_result integer;
BEGIN
  -- Only recalculate when match has scores
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
    RETURN NEW;
  END IF;

  FOR pred IN
    SELECT p.id, p.home_pred, p.away_pred, p.pool_id
    FROM public.predictions p
    WHERE p.match_id = NEW.id
      AND p.home_pred IS NOT NULL
      AND p.away_pred IS NOT NULL
  LOOP
    -- Get pool scoring rules
    SELECT scoring_rules_json INTO pool_rules
    FROM public.pools WHERE id = pred.pool_id;

    pts := 0;

    -- Exact score
    IF pred.home_pred = NEW.home_score AND pred.away_pred = NEW.away_score THEN
      pts := COALESCE((pool_rules->>'exact')::integer, 5);
    ELSE
      pred_diff := pred.home_pred - pred.away_pred;
      actual_diff := NEW.home_score - NEW.away_score;
      pred_result := SIGN(pred_diff);
      actual_result := SIGN(actual_diff);

      -- Correct result (winner/draw)
      IF pred_result = actual_result THEN
        pts := COALESCE((pool_rules->>'result')::integer, 3);
        -- Bonus: correct goal difference
        IF COALESCE((pool_rules->>'goal_diff')::integer, 0) > 0 AND pred_diff = actual_diff THEN
          pts := pts + (pool_rules->>'goal_diff')::integer;
        END IF;
      END IF;
    END IF;

    UPDATE public.predictions SET points_awarded = pts WHERE id = pred.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalculate_points
AFTER UPDATE OF home_score, away_score, status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_match_points();
