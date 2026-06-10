-- ============================================================
-- claim_api_budget — atomic 500/dag hard cap voor de WC2026 API
--
-- Edge function sync-wc2026 roept dit aan voor elke individuele
-- upstream call. Bij granted=false stopt 'ie meteen, geen fetch.
-- ON CONFLICT WHERE garandeert race-condition-vrije claim.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_api_budget(_calls_needed INT DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  daily_limit INT := 500;
  new_count   INT;
BEGIN
  INSERT INTO api_usage (usage_date, request_count)
  VALUES (CURRENT_DATE, _calls_needed)
  ON CONFLICT (usage_date) DO UPDATE
    SET request_count = api_usage.request_count + EXCLUDED.request_count
    WHERE api_usage.request_count + EXCLUDED.request_count <= daily_limit
  RETURNING request_count INTO new_count;

  IF new_count IS NULL THEN
    SELECT request_count INTO new_count FROM api_usage WHERE usage_date = CURRENT_DATE;
    RETURN jsonb_build_object(
      'granted',          false,
      'calls_today',      COALESCE(new_count, 0),
      'budget_remaining', daily_limit - COALESCE(new_count, 0),
      'reason',           'daily_cap_500'
    );
  END IF;

  RETURN jsonb_build_object(
    'granted',          true,
    'calls_today',      new_count,
    'budget_remaining', daily_limit - new_count
  );
END $$;

GRANT EXECUTE ON FUNCTION public.claim_api_budget(INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
