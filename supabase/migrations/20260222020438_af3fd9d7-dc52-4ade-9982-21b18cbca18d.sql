-- Remove test match data (finished matches and their related events/predictions)
DELETE FROM match_events WHERE match_id IN ('a50ef3c3-5add-4253-964b-1de5cf65da46', '156254c4-75a2-4702-8a79-4dec785d4d8a');
DELETE FROM predictions WHERE match_id IN ('a50ef3c3-5add-4253-964b-1de5cf65da46', '156254c4-75a2-4702-8a79-4dec785d4d8a');
DELETE FROM matches WHERE status = 'finished';

-- Reset any remaining matches to scheduled status
UPDATE matches SET status = 'scheduled', home_score = NULL, away_score = NULL WHERE status != 'scheduled';