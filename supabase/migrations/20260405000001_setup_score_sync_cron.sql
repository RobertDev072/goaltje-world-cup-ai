-- Cron jobs voor automatische score synchronisatie
-- sync-live : elke 2 minuten (live wedstrijdscores)
-- sync-fixtures : elke 6 uur (eindstanden + aankomende wedstrijden)

-- Verwijder bestaande jobs als ze al bestaan
SELECT cron.unschedule('sync-live-scores') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-live-scores'
);
SELECT cron.unschedule('sync-fixtures-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-fixtures-daily'
);

-- Live scores: elke 2 minuten
SELECT cron.schedule(
  'sync-live-scores',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/fetch-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"action":"sync-live"}'::jsonb
  );
  $$
);

-- Fixtures sync: elke 6 uur (00:00, 06:00, 12:00, 18:00 UTC)
SELECT cron.schedule(
  'sync-fixtures-daily',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/fetch-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"action":"sync-fixtures"}'::jsonb
  );
  $$
);
