SELECT cron.schedule(
  'batch-wk-news-every-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://piahvmeitbcibtsjagur.supabase.co/functions/v1/batch-wk-news',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWh2bWVpdGJjaWJ0c2phZ3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTQwNzUsImV4cCI6MjA4NzI5MDA3NX0.yVT7AOv17AqI2LmyyQs0BwX8_bNOKSrjNd6WWj_lKv4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);