-- ============================================================
-- Admin full access: system settings, RLS bypass, RPCs
-- ============================================================

-- 1. System settings tabel (aankondigingen, maintenance mode etc.)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read system settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Standaard aankondiging record
INSERT INTO public.system_settings (key, value)
VALUES ('announcement', '{"text":"","active":false,"type":"info"}')
ON CONFLICT (key) DO NOTHING;

-- 2. Admins kunnen pool_messages zien en verwijderen (moderatie)
DROP POLICY IF EXISTS "Admins can view all messages" ON public.pool_messages;
CREATE POLICY "Admins can view all messages"
  ON public.pool_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any message" ON public.pool_messages;
CREATE POLICY "Admins can delete any message"
  ON public.pool_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. Admins kunnen leden uit poules verwijderen
DROP POLICY IF EXISTS "Admins can delete pool members" ON public.pool_members;
CREATE POLICY "Admins can delete pool members"
  ON public.pool_members FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. Admins kunnen alle poules bewerken
DROP POLICY IF EXISTS "Admins can update all pools" ON public.pools;
CREATE POLICY "Admins can update all pools"
  ON public.pools FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Admins kunnen nieuwe wedstrijden toevoegen (knockout ronden)
DROP POLICY IF EXISTS "Admins can insert matches" ON public.matches;
CREATE POLICY "Admins can insert matches"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. Admins kunnen profielen bewerken
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 7. Admins kunnen rollen beheren
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 8. Admins kunnen bonus predictions zien en bijwerken
DROP POLICY IF EXISTS "Admins can view all bonus predictions" ON public.bonus_predictions;
CREATE POLICY "Admins can view all bonus predictions"
  ON public.bonus_predictions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update bonus predictions" ON public.bonus_predictions;
CREATE POLICY "Admins can update bonus predictions"
  ON public.bonus_predictions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 9. Admins kunnen bonus questions beheren
DROP POLICY IF EXISTS "Admins can manage bonus questions" ON public.bonus_questions;
CREATE POLICY "Admins can manage bonus questions"
  ON public.bonus_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RPC: Admin pool leaderboard (leden + punten per poule)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pool_leaderboard_admin(p_pool_id uuid)
RETURNS TABLE(
  user_id        uuid,
  name           text,
  avatar_url     text,
  total_points   bigint,
  pred_count     bigint,
  role           text,
  joined_at      timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pm.user_id,
    pr.name,
    pr.avatar_url,
    COALESCE(SUM(pred.points_awarded), 0)::bigint AS total_points,
    COUNT(pred.id)::bigint AS pred_count,
    pm.role,
    pm.joined_at
  FROM pool_members pm
  LEFT JOIN profiles pr ON pr.id = pm.user_id
  LEFT JOIN predictions pred
    ON pred.user_id = pm.user_id
   AND pred.pool_id = p_pool_id
   AND pred.points_awarded IS NOT NULL
  WHERE pm.pool_id = p_pool_id
  GROUP BY pm.user_id, pr.name, pr.avatar_url, pm.role, pm.joined_at
  ORDER BY total_points DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_pool_leaderboard_admin(uuid) TO authenticated;

-- ============================================================
-- RPC: Voorspellingsverdeling per wedstrijd (analytics)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_match_prediction_distribution(p_match_id uuid)
RETURNS TABLE(
  home_pred  integer,
  away_pred  integer,
  cnt        bigint,
  pct        numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    home_pred,
    away_pred,
    COUNT(DISTINCT user_id)::bigint AS cnt,
    ROUND(100.0 * COUNT(DISTINCT user_id) / NULLIF(SUM(COUNT(DISTINCT user_id)) OVER (), 0), 1) AS pct
  FROM predictions
  WHERE match_id = p_match_id
    AND home_pred IS NOT NULL
    AND away_pred IS NOT NULL
  GROUP BY home_pred, away_pred
  ORDER BY cnt DESC
  LIMIT 25;
$$;
GRANT EXECUTE ON FUNCTION public.get_match_prediction_distribution(uuid) TO authenticated;

-- ============================================================
-- RPC: Reset invite code van een poule
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_invite_code(p_pool_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  v_code := upper(substring(md5(random()::text || gen_random_uuid()::text), 1, 8));
  UPDATE pools SET invite_code = v_code WHERE id = p_pool_id;
  RETURN v_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reset_invite_code(uuid) TO authenticated;

-- ============================================================
-- RPC: Ken bonuspunten toe na invullen correct antwoord
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_award_bonus_points(
  p_question_id    uuid,
  p_correct_answer text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_points  integer;
  v_awarded integer;
BEGIN
  SELECT points INTO v_points FROM bonus_questions WHERE id = p_question_id;
  UPDATE bonus_questions SET correct_answer = p_correct_answer WHERE id = p_question_id;
  UPDATE bonus_predictions
    SET points_awarded = v_points
  WHERE question_id = p_question_id
    AND lower(trim(answer)) = lower(trim(p_correct_answer));
  GET DIAGNOSTICS v_awarded = ROW_COUNT;
  UPDATE bonus_predictions
    SET points_awarded = 0
  WHERE question_id = p_question_id
    AND lower(trim(answer)) != lower(trim(p_correct_answer));
  RETURN v_awarded;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_award_bonus_points(uuid, text) TO authenticated;
