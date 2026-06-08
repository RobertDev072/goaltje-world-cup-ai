-- ============================================================
-- Vlaggen-correctie voor alle 48 WK 2026 teams
--
-- Gemeld: Schotland toonde de UK-vlag 🇬🇧 i.p.v. de Schotse 🏴󠁧󠁢󠁳󠁣󠁴󠁿.
-- Deze migration zet de flag_url van élk team correct op basis van
-- short_name, zodat de hele lijst gegarandeerd klopt.
--
-- Idempotent: kan veilig opnieuw gerund worden.
-- ============================================================

UPDATE public.teams SET flag_url = CASE short_name
  -- Group A
  WHEN 'MEX' THEN '🇲🇽'
  WHEN 'RSA' THEN '🇿🇦'
  WHEN 'KOR' THEN '🇰🇷'
  -- Group B
  WHEN 'CAN' THEN '🇨🇦'
  WHEN 'QAT' THEN '🇶🇦'
  WHEN 'SUI' THEN '🇨🇭'
  -- Group C
  WHEN 'BRA' THEN '🇧🇷'
  WHEN 'MAR' THEN '🇲🇦'
  WHEN 'HAI' THEN '🇭🇹'
  WHEN 'SCO' THEN '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  -- Group D
  WHEN 'USA' THEN '🇺🇸'
  WHEN 'PAR' THEN '🇵🇾'
  WHEN 'AUS' THEN '🇦🇺'
  -- Group E
  WHEN 'GER' THEN '🇩🇪'
  WHEN 'CUW' THEN '🇨🇼'
  WHEN 'CIV' THEN '🇨🇮'
  WHEN 'ECU' THEN '🇪🇨'
  -- Group F
  WHEN 'NED' THEN '🇳🇱'
  WHEN 'JPN' THEN '🇯🇵'
  WHEN 'TUN' THEN '🇹🇳'
  -- Group G
  WHEN 'BEL' THEN '🇧🇪'
  WHEN 'EGY' THEN '🇪🇬'
  WHEN 'IRN' THEN '🇮🇷'
  WHEN 'NZL' THEN '🇳🇿'
  -- Group H
  WHEN 'ESP' THEN '🇪🇸'
  WHEN 'CPV' THEN '🇨🇻'
  WHEN 'KSA' THEN '🇸🇦'
  WHEN 'URU' THEN '🇺🇾'
  -- Group I
  WHEN 'FRA' THEN '🇫🇷'
  WHEN 'SEN' THEN '🇸🇳'
  WHEN 'NOR' THEN '🇳🇴'
  -- Group J
  WHEN 'ARG' THEN '🇦🇷'
  WHEN 'ALG' THEN '🇩🇿'
  WHEN 'AUT' THEN '🇦🇹'
  WHEN 'JOR' THEN '🇯🇴'
  -- Group K
  WHEN 'POR' THEN '🇵🇹'
  WHEN 'UZB' THEN '🇺🇿'
  WHEN 'COL' THEN '🇨🇴'
  -- Group L
  WHEN 'ENG' THEN '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  WHEN 'CRO' THEN '🇭🇷'
  WHEN 'GHA' THEN '🇬🇭'
  WHEN 'PAN' THEN '🇵🇦'
  -- Playoff placeholders (nog niet gekwalificeerd)
  WHEN 'EPA' THEN '🏳️'
  WHEN 'EPB' THEN '🏳️'
  WHEN 'EPC' THEN '🏳️'
  WHEN 'EPD' THEN '🏳️'
  WHEN 'FP1' THEN '🏳️'
  WHEN 'FP2' THEN '🏳️'
  ELSE flag_url
END
WHERE short_name IN (
  'MEX','RSA','KOR','CAN','QAT','SUI','BRA','MAR','HAI','SCO',
  'USA','PAR','AUS','GER','CUW','CIV','ECU','NED','JPN','TUN',
  'BEL','EGY','IRN','NZL','ESP','CPV','KSA','URU','FRA','SEN',
  'NOR','ARG','ALG','AUT','JOR','POR','UZB','COL','ENG','CRO',
  'GHA','PAN','EPA','EPB','EPC','EPD','FP1','FP2'
);
