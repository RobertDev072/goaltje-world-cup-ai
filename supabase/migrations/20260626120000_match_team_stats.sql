-- ============================================================
-- Team-statistieken per wedstrijd, 100% afgeleid uit eigen data
-- (matches-tabel). Geen externe bron. Voor de match-detailpagina:
-- toont per team W/G/V, doelpunten voor/tegen, doelsaldo, clean
-- sheets, vorm (laatste 5) + onderlinge duels (head-to-head).
--
-- get_team_tournament_stats(team_id) — herbruikbaar per team.
-- get_match_team_stats(match_id)     — beide teams + h2h voor 1 match.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_tournament_stats(_team_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH played AS (
    SELECT
      m.kickoff_utc, m.stage,
      CASE WHEN m.home_team_id = _team_id THEN m.home_score ELSE m.away_score END AS gf,
      CASE WHEN m.home_team_id = _team_id THEN m.away_score ELSE m.home_score END AS ga,
      CASE WHEN m.home_team_id = _team_id THEN m.away_team_id ELSE m.home_team_id END AS opp_id
    FROM matches m
    WHERE m.status = 'finished'
      AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
      AND _team_id IN (m.home_team_id, m.away_team_id)
  )
  SELECT jsonb_build_object(
    'played',       COUNT(*),
    'won',          COUNT(*) FILTER (WHERE gf > ga),
    'drawn',        COUNT(*) FILTER (WHERE gf = ga),
    'lost',         COUNT(*) FILTER (WHERE gf < ga),
    'gf',           COALESCE(SUM(gf), 0),
    'ga',           COALESCE(SUM(ga), 0),
    'gd',           COALESCE(SUM(gf - ga), 0),
    'clean_sheets', COUNT(*) FILTER (WHERE ga = 0),
    -- Vorm: laatste 5 gespeelde wedstrijden, chronologisch (oud → nieuw)
    'form', COALESCE((
      SELECT jsonb_agg(f ORDER BY (f->>'kickoff'))
      FROM (
        SELECT jsonb_build_object(
          'result',  CASE WHEN p.gf > p.ga THEN 'W' WHEN p.gf = p.ga THEN 'D' ELSE 'L' END,
          'gf',      p.gf,
          'ga',      p.ga,
          'opp',     t.short_name,
          'opp_flag',t.flag_url,
          'kickoff', p.kickoff_utc,
          'stage',   p.stage
        ) AS f
        FROM played p
        LEFT JOIN teams t ON t.id = p.opp_id
        ORDER BY p.kickoff_utc DESC
        LIMIT 5
      ) sub
    ), '[]'::jsonb)
  )
  FROM played;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_tournament_stats(UUID) TO authenticated, anon;

-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_match_team_stats(_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid UUID;
  aid UUID;
  h2h JSONB;
BEGIN
  SELECT home_team_id, away_team_id INTO hid, aid FROM matches WHERE id = _match_id;

  -- Onderlinge duels eerder in dit toernooi (afgerond)
  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'kickoff') DESC), '[]'::jsonb) INTO h2h
  FROM (
    SELECT jsonb_build_object(
      'kickoff',    m.kickoff_utc,
      'stage',      m.stage,
      'home_short', ht.short_name,
      'away_short', at.short_name,
      'home_score', m.home_score,
      'away_score', m.away_score
    ) AS x
    FROM matches m
    LEFT JOIN teams ht ON ht.id = m.home_team_id
    LEFT JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'finished'
      AND m.id <> _match_id
      AND hid IS NOT NULL AND aid IS NOT NULL
      AND (
        (m.home_team_id = hid AND m.away_team_id = aid) OR
        (m.home_team_id = aid AND m.away_team_id = hid)
      )
  ) q;

  RETURN jsonb_build_object(
    'home', CASE WHEN hid IS NULL THEN NULL ELSE public.get_team_tournament_stats(hid) END,
    'away', CASE WHEN aid IS NULL THEN NULL ELSE public.get_team_tournament_stats(aid) END,
    'h2h',  h2h
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_match_team_stats(UUID) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
