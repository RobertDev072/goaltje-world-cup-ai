-- ============================================================
-- Admin RLS bypass + schaalbaarheid voor 900+ gebruikers
-- ============================================================
-- Probleem: admin kon alleen pools/leden zien van pools waar hij
-- zelf lid van is. Nu krijgt de admin volledige leestoegang.

-- 1. Admins mogen alle pools zien
CREATE POLICY "Admins can view all pools"
  ON public.pools FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Admins mogen alle pool_members zien
CREATE POLICY "Admins can view all pool members"
  ON public.pool_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Admins mogen alle predictions zien (nodig voor globale ranglijst)
CREATE POLICY "Admins can view all predictions"
  ON public.predictions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Globale ranglijst RPC (server-side aggregatie, schaalt beter
-- dan client-side ophalen van alle rijen bij 900+ gebruikers)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_global_ranking(limit_count integer DEFAULT 10)
RETURNS TABLE(
  rank   bigint,
  user_id uuid,
  name   text,
  avatar_url text,
  total_points bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY totals.total_points DESC) AS rank,
    totals.user_id,
    p.name,
    p.avatar_url,
    totals.total_points
  FROM (
    -- Één voorspelling per user per wedstrijd: hoogste score telt
    SELECT
      dp.user_id,
      SUM(dp.max_pts)::bigint AS total_points
    FROM (
      SELECT user_id, match_id, MAX(points_awarded) AS max_pts
      FROM public.predictions
      WHERE points_awarded IS NOT NULL
      GROUP BY user_id, match_id
    ) dp
    GROUP BY dp.user_id
    ORDER BY total_points DESC
    LIMIT limit_count
  ) totals
  LEFT JOIN public.profiles p ON p.id = totals.user_id
  ORDER BY totals.total_points DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_ranking(integer) TO authenticated;

-- ============================================================
-- Extra index voor leaderboard-queries bij grote pools (500+ leden)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_predictions_points_awarded
  ON public.predictions(points_awarded)
  WHERE points_awarded IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_user_match
  ON public.predictions(user_id, match_id);

CREATE INDEX IF NOT EXISTS idx_pools_created_by
  ON public.pools(created_by);
