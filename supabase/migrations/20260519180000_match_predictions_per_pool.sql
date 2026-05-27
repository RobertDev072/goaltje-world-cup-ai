-- ============================================================
-- get_match_predictions_for_pool — per-member voorspellingen
-- voor één wedstrijd in één poel.
--
-- Server-side gate: alleen zichtbaar voor pool members ÉN
-- alleen als de prediction-deadline al voorbij is. Voor
-- toekomstige wedstrijden geeft de RPC een lege array terug
-- zodat copy-gedrag onmogelijk is.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_match_predictions_for_pool(
  _pool_id  UUID,
  _match_id UUID
)
RETURNS TABLE(
  user_id        UUID,
  name           TEXT,
  avatar_url     TEXT,
  home_pred      INT,
  away_pred      INT,
  points_awarded INT,
  is_self        BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deadline TIMESTAMPTZ;
  me       UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_pool_member(me, _pool_id) THEN
    RAISE EXCEPTION 'Not a member of this pool';
  END IF;

  SELECT COALESCE(prediction_deadline_utc, kickoff_utc)
    INTO deadline
    FROM matches WHERE id = _match_id;

  IF deadline IS NULL OR deadline > NOW() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pr.user_id,
    COALESCE(p.name, 'Onbekend') AS name,
    p.avatar_url,
    pr.home_pred,
    pr.away_pred,
    pr.points_awarded,
    (pr.user_id = me)            AS is_self
  FROM predictions pr
  LEFT JOIN profiles p ON p.user_id = pr.user_id
  WHERE pr.pool_id  = _pool_id
    AND pr.match_id = _match_id
  ORDER BY pr.points_awarded DESC NULLS LAST, name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_predictions_for_pool(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
