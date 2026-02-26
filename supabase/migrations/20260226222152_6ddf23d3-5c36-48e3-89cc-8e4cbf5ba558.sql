-- Fix ALL group match times, venues, and home/away based on official schedule
-- Times are stored as UTC (user provided Dutch CEST = UTC+2)
-- Also add 2 missing Group A matches and all 32 knockout matches

DO $$
DECLARE
  rec RECORD;
  v_home_id uuid;
  v_away_id uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      -- GROUP A
      ('MEX','RSA','A','2026-06-11 19:00:00+00','Estadio Azteca, Mexico City'),
      ('KOR','EPD','A','2026-06-12 02:00:00+00','Estadio Akron, Guadalajara'),
      ('EPD','RSA','A','2026-06-18 16:00:00+00','Mercedes-Benz Stadium, Atlanta'),
      ('MEX','KOR','A','2026-06-19 01:00:00+00','Estadio Akron, Guadalajara'),
      ('EPD','MEX','A','2026-06-25 01:00:00+00','Estadio Azteca, Mexico City'),
      ('RSA','KOR','A','2026-06-25 01:00:00+00','Estadio BBVA, Monterrey'),
      -- GROUP B
      ('CAN','EPA','B','2026-06-12 19:00:00+00','BMO Field, Toronto'),
      ('QAT','SUI','B','2026-06-13 19:00:00+00','Levi''s Stadium, Santa Clara'),
      ('SUI','EPA','B','2026-06-18 19:00:00+00','SoFi Stadium, Los Angeles'),
      ('CAN','QAT','B','2026-06-18 22:00:00+00','BC Place, Vancouver'),
      ('SUI','CAN','B','2026-06-24 19:00:00+00','BC Place, Vancouver'),
      ('EPA','QAT','B','2026-06-24 19:00:00+00','Lumen Field, Seattle'),
      -- GROUP C
      ('BRA','MAR','C','2026-06-13 22:00:00+00','MetLife Stadium, East Rutherford'),
      ('HAI','SCO','C','2026-06-14 01:00:00+00','Gillette Stadium, Foxborough'),
      ('SCO','MAR','C','2026-06-19 22:00:00+00','Gillette Stadium, Foxborough'),
      ('BRA','HAI','C','2026-06-20 01:00:00+00','Lincoln Financial Field, Philadelphia'),
      ('SCO','BRA','C','2026-06-24 22:00:00+00','Hard Rock Stadium, Miami Gardens'),
      ('MAR','HAI','C','2026-06-24 22:00:00+00','Mercedes-Benz Stadium, Atlanta'),
      -- GROUP D
      ('USA','PAR','D','2026-06-13 01:00:00+00','SoFi Stadium, Los Angeles'),
      ('AUS','EPC','D','2026-06-13 04:00:00+00','BC Place, Vancouver'),
      ('EPC','PAR','D','2026-06-19 04:00:00+00','Levi''s Stadium, Santa Clara'),
      ('USA','AUS','D','2026-06-19 19:00:00+00','Lumen Field, Seattle'),
      ('EPC','USA','D','2026-06-26 02:00:00+00','SoFi Stadium, Los Angeles'),
      ('PAR','AUS','D','2026-06-26 02:00:00+00','Levi''s Stadium, Santa Clara'),
      -- GROUP E
      ('GER','CUW','E','2026-06-14 17:00:00+00','NRG Stadium, Houston'),
      ('CIV','ECU','E','2026-06-14 23:00:00+00','Lincoln Financial Field, Philadelphia'),
      ('GER','CIV','E','2026-06-20 20:00:00+00','BMO Field, Toronto'),
      ('ECU','CUW','E','2026-06-21 00:00:00+00','Arrowhead Stadium, Kansas City'),
      ('ECU','GER','E','2026-06-25 20:00:00+00','MetLife Stadium, East Rutherford'),
      ('CUW','CIV','E','2026-06-25 20:00:00+00','Lincoln Financial Field, Philadelphia'),
      -- GROUP F
      ('NED','JPN','F','2026-06-14 20:00:00+00','AT&T Stadium, Arlington'),
      ('EPB','TUN','F','2026-06-15 02:00:00+00','Estadio BBVA, Monterrey'),
      ('TUN','JPN','F','2026-06-20 04:00:00+00','Estadio BBVA, Monterrey'),
      ('NED','EPB','F','2026-06-20 17:00:00+00','NRG Stadium, Houston'),
      ('JPN','EPB','F','2026-06-25 23:00:00+00','AT&T Stadium, Arlington'),
      ('TUN','NED','F','2026-06-25 23:00:00+00','Arrowhead Stadium, Kansas City'),
      -- GROUP G
      ('BEL','EGY','G','2026-06-15 19:00:00+00','Lumen Field, Seattle'),
      ('IRN','NZL','G','2026-06-16 01:00:00+00','SoFi Stadium, Los Angeles'),
      ('BEL','IRN','G','2026-06-21 19:00:00+00','SoFi Stadium, Los Angeles'),
      ('NZL','EGY','G','2026-06-22 01:00:00+00','BC Place, Vancouver'),
      ('EGY','IRN','G','2026-06-27 03:00:00+00','Lumen Field, Seattle'),
      ('NZL','BEL','G','2026-06-27 03:00:00+00','BC Place, Vancouver'),
      -- GROUP H
      ('ESP','CPV','H','2026-06-15 16:00:00+00','Mercedes-Benz Stadium, Atlanta'),
      ('KSA','URU','H','2026-06-15 22:00:00+00','Hard Rock Stadium, Miami Gardens'),
      ('ESP','KSA','H','2026-06-21 16:00:00+00','Mercedes-Benz Stadium, Atlanta'),
      ('URU','CPV','H','2026-06-21 22:00:00+00','Hard Rock Stadium, Miami Gardens'),
      ('CPV','KSA','H','2026-06-27 00:00:00+00','NRG Stadium, Houston'),
      ('URU','ESP','H','2026-06-27 00:00:00+00','Estadio Akron, Guadalajara'),
      -- GROUP I
      ('FRA','SEN','I','2026-06-16 19:00:00+00','MetLife Stadium, East Rutherford'),
      ('FP2','NOR','I','2026-06-16 22:00:00+00','Gillette Stadium, Foxborough'),
      ('FRA','FP2','I','2026-06-22 21:00:00+00','Lincoln Financial Field, Philadelphia'),
      ('NOR','SEN','I','2026-06-23 00:00:00+00','MetLife Stadium, East Rutherford'),
      ('NOR','FRA','I','2026-06-26 19:00:00+00','Gillette Stadium, Foxborough'),
      ('SEN','FP2','I','2026-06-26 19:00:00+00','BMO Field, Toronto'),
      -- GROUP J
      ('AUT','JOR','J','2026-06-16 04:00:00+00','Levi''s Stadium, Santa Clara'),
      ('ARG','ALG','J','2026-06-17 01:00:00+00','Arrowhead Stadium, Kansas City'),
      ('ARG','AUT','J','2026-06-22 17:00:00+00','AT&T Stadium, Arlington'),
      ('JOR','ALG','J','2026-06-23 03:00:00+00','Levi''s Stadium, Santa Clara'),
      ('ALG','AUT','J','2026-06-28 02:00:00+00','Arrowhead Stadium, Kansas City'),
      ('JOR','ARG','J','2026-06-28 02:00:00+00','AT&T Stadium, Arlington'),
      -- GROUP K
      ('POR','FP1','K','2026-06-17 17:00:00+00','NRG Stadium, Houston'),
      ('UZB','COL','K','2026-06-18 02:00:00+00','Estadio Azteca, Mexico City'),
      ('POR','UZB','K','2026-06-23 17:00:00+00','NRG Stadium, Houston'),
      ('COL','FP1','K','2026-06-24 02:00:00+00','Estadio Akron, Guadalajara'),
      ('COL','POR','K','2026-06-27 23:30:00+00','Hard Rock Stadium, Miami Gardens'),
      ('FP1','UZB','K','2026-06-27 23:30:00+00','Mercedes-Benz Stadium, Atlanta'),
      -- GROUP L
      ('ENG','CRO','L','2026-06-17 20:00:00+00','AT&T Stadium, Arlington'),
      ('GHA','PAN','L','2026-06-17 23:00:00+00','BMO Field, Toronto'),
      ('ENG','GHA','L','2026-06-23 20:00:00+00','Gillette Stadium, Foxborough'),
      ('PAN','CRO','L','2026-06-23 23:00:00+00','BMO Field, Toronto'),
      ('PAN','ENG','L','2026-06-27 21:00:00+00','MetLife Stadium, East Rutherford'),
      ('CRO','GHA','L','2026-06-27 21:00:00+00','Lincoln Financial Field, Philadelphia')
    ) AS t(home_short, away_short, grp, kickoff, venue)
  LOOP
    SELECT id INTO v_home_id FROM teams WHERE short_name = rec.home_short;
    SELECT id INTO v_away_id FROM teams WHERE short_name = rec.away_short;

    UPDATE matches SET
      kickoff_utc = rec.kickoff::timestamptz,
      venue = rec.venue,
      home_team_id = v_home_id,
      away_team_id = v_away_id,
      last_updated = now()
    WHERE "group" = rec.grp
      AND stage = 'group'
      AND (
        (home_team_id = v_home_id AND away_team_id = v_away_id)
        OR (home_team_id = v_away_id AND away_team_id = v_home_id)
      );

    IF NOT FOUND THEN
      INSERT INTO matches (home_team_id, away_team_id, "group", stage, kickoff_utc, venue, status)
      VALUES (v_home_id, v_away_id, rec.grp, 'group', rec.kickoff::timestamptz, rec.venue, 'scheduled');
    END IF;
  END LOOP;
END $$;

-- Insert knockout matches (teams TBD - determined by group results)
INSERT INTO matches (external_id, stage, kickoff_utc, venue, status) VALUES
  ('#73', 'round_of_32', '2026-06-28 19:00:00+00', 'SoFi Stadium, Los Angeles', 'scheduled'),
  ('#74', 'round_of_32', '2026-06-29 20:30:00+00', 'Gillette Stadium, Foxborough', 'scheduled'),
  ('#75', 'round_of_32', '2026-06-30 01:00:00+00', 'Estadio BBVA, Monterrey', 'scheduled'),
  ('#76', 'round_of_32', '2026-06-29 17:00:00+00', 'NRG Stadium, Houston', 'scheduled'),
  ('#77', 'round_of_32', '2026-06-30 21:00:00+00', 'MetLife Stadium, East Rutherford', 'scheduled'),
  ('#78', 'round_of_32', '2026-06-30 17:00:00+00', 'AT&T Stadium, Arlington', 'scheduled'),
  ('#79', 'round_of_32', '2026-07-01 01:00:00+00', 'Estadio Azteca, Mexico City', 'scheduled'),
  ('#80', 'round_of_32', '2026-07-01 16:00:00+00', 'Mercedes-Benz Stadium, Atlanta', 'scheduled'),
  ('#81', 'round_of_32', '2026-07-02 00:00:00+00', 'Lumen Field, Seattle', 'scheduled'),
  ('#82', 'round_of_32', '2026-07-01 20:00:00+00', 'Levi''s Stadium, Santa Clara', 'scheduled'),
  ('#83', 'round_of_32', '2026-07-02 23:00:00+00', 'BMO Field, Toronto', 'scheduled'),
  ('#84', 'round_of_32', '2026-07-02 19:00:00+00', 'SoFi Stadium, Los Angeles', 'scheduled'),
  ('#85', 'round_of_32', '2026-07-03 03:00:00+00', 'BC Place, Vancouver', 'scheduled'),
  ('#86', 'round_of_32', '2026-07-03 22:00:00+00', 'Hard Rock Stadium, Miami Gardens', 'scheduled'),
  ('#87', 'round_of_32', '2026-07-04 01:30:00+00', 'Arrowhead Stadium, Kansas City', 'scheduled'),
  ('#88', 'round_of_32', '2026-07-03 18:00:00+00', 'AT&T Stadium, Arlington', 'scheduled'),
  ('#89', 'round_of_16', '2026-07-04 21:00:00+00', 'Lincoln Financial Field, Philadelphia', 'scheduled'),
  ('#90', 'round_of_16', '2026-07-04 17:00:00+00', 'NRG Stadium, Houston', 'scheduled'),
  ('#91', 'round_of_16', '2026-07-05 20:00:00+00', 'MetLife Stadium, East Rutherford', 'scheduled'),
  ('#92', 'round_of_16', '2026-07-06 00:00:00+00', 'Estadio Azteca, Mexico City', 'scheduled'),
  ('#93', 'round_of_16', '2026-07-06 19:00:00+00', 'AT&T Stadium, Arlington', 'scheduled'),
  ('#94', 'round_of_16', '2026-07-07 00:00:00+00', 'Lumen Field, Seattle', 'scheduled'),
  ('#95', 'round_of_16', '2026-07-07 16:00:00+00', 'Mercedes-Benz Stadium, Atlanta', 'scheduled'),
  ('#96', 'round_of_16', '2026-07-07 20:00:00+00', 'BC Place, Vancouver', 'scheduled'),
  ('#97', 'quarter_final', '2026-07-09 20:00:00+00', 'Gillette Stadium, Foxborough', 'scheduled'),
  ('#98', 'quarter_final', '2026-07-10 19:00:00+00', 'SoFi Stadium, Los Angeles', 'scheduled'),
  ('#99', 'quarter_final', '2026-07-11 21:00:00+00', 'Hard Rock Stadium, Miami Gardens', 'scheduled'),
  ('#100', 'quarter_final', '2026-07-12 01:00:00+00', 'Arrowhead Stadium, Kansas City', 'scheduled'),
  ('#101', 'semi_final', '2026-07-14 19:00:00+00', 'AT&T Stadium, Arlington', 'scheduled'),
  ('#102', 'semi_final', '2026-07-15 19:00:00+00', 'Mercedes-Benz Stadium, Atlanta', 'scheduled'),
  ('#103', 'third_place', '2026-07-18 21:00:00+00', 'Hard Rock Stadium, Miami Gardens', 'scheduled'),
  ('#104', 'final', '2026-07-19 19:00:00+00', 'MetLife Stadium, East Rutherford', 'scheduled');
