-- ============================================================
-- Early Bird +10 — fix logica
--
-- Was: vereiste voorspellingen voor ALLE matches (onmogelijk, KO-fase
--      heeft nog geen teams).
-- Nu : telt alleen GROUP STAGE matches met beide teams bekend. Bonus
--      wordt toegekend per (pool, user) zodra:
--        1. user is geen admin
--        2. user heeft voor elke groepswedstrijd in zijn poel een
--           voorspelling staan
--        3. ALLE voorspellingen zijn voor de eerste kickoff aangemaakt
-- Idempotent: gebruikers die al 10 hebben worden overgeslagen.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_early_bird()
RETURNS TABLE(users_awarded INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_group_matches INT;
  first_kickoff       TIMESTAMPTZ;
  awarded             INT;
BEGIN
  SELECT COUNT(*) INTO total_group_matches
    FROM matches
   WHERE stage = 'group'
     AND home_team_id IS NOT NULL
     AND away_team_id IS NOT NULL;

  SELECT MIN(kickoff_utc) INTO first_kickoff
    FROM matches
   WHERE stage = 'group'
     AND home_team_id IS NOT NULL
     AND away_team_id IS NOT NULL;

  IF total_group_matches = 0 OR first_kickoff IS NULL THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  WITH eligible AS (
    SELECT pm.pool_id, pm.user_id
      FROM pool_members pm
     WHERE pm.early_bird_bonus = 0
       AND NOT EXISTS (
         SELECT 1 FROM user_roles ur
          WHERE ur.user_id = pm.user_id AND ur.role = 'admin'
       )
       AND (
         SELECT COUNT(*) FROM predictions p
          JOIN matches m ON m.id = p.match_id
         WHERE p.user_id = pm.user_id
           AND p.pool_id = pm.pool_id
           AND m.stage = 'group'
           AND m.home_team_id IS NOT NULL
           AND m.away_team_id IS NOT NULL
           AND p.created_at <= first_kickoff
       ) >= total_group_matches
  ),
  updated AS (
    UPDATE pool_members pm
       SET early_bird_bonus = 10
      FROM eligible e
     WHERE pm.pool_id = e.pool_id
       AND pm.user_id = e.user_id
    RETURNING 1
  )
  SELECT COUNT(*)::INT INTO awarded FROM updated;

  RETURN QUERY SELECT awarded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_early_bird() TO authenticated;

-- ------------------------------------------------------------
-- get_my_early_bird_status: laat de gebruiker hun eigen status zien
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_early_bird_status()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid                  UUID := auth.uid();
  total_group_matches  INT;
  first_kickoff        TIMESTAMPTZ;
  best_pred_count      INT := 0;
  earned_in_pools      INT;
  is_admin_user        BOOLEAN;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT public.has_role(uid, 'admin') INTO is_admin_user;

  SELECT COUNT(*), MIN(kickoff_utc)
    INTO total_group_matches, first_kickoff
    FROM matches
   WHERE stage = 'group'
     AND home_team_id IS NOT NULL
     AND away_team_id IS NOT NULL;

  -- Hoeveel groepswedstrijden heeft de gebruiker al voorspeld in zijn
  -- BEST poolgevulde lidmaatschap (op tijd ingevuld)
  SELECT COALESCE(MAX(c), 0) INTO best_pred_count
    FROM (
      SELECT COUNT(*) AS c
        FROM predictions p
        JOIN matches m ON m.id = p.match_id
        JOIN pool_members pm ON pm.user_id = p.user_id AND pm.pool_id = p.pool_id
       WHERE p.user_id = uid
         AND m.stage = 'group'
         AND m.home_team_id IS NOT NULL
         AND m.away_team_id IS NOT NULL
         AND (first_kickoff IS NULL OR p.created_at <= first_kickoff)
       GROUP BY p.pool_id
    ) t;

  SELECT COUNT(*) INTO earned_in_pools
    FROM pool_members
   WHERE user_id = uid AND early_bird_bonus > 0;

  RETURN jsonb_build_object(
    'is_admin',         COALESCE(is_admin_user, false),
    'total_needed',     total_group_matches,
    'predicted_count',  best_pred_count,
    'first_kickoff',    first_kickoff,
    'before_kickoff',   first_kickoff IS NOT NULL AND NOW() < first_kickoff,
    'earned_in_pools',  earned_in_pools,
    'earned',           earned_in_pools > 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_early_bird_status() TO authenticated;

NOTIFY pgrst, 'reload schema';
