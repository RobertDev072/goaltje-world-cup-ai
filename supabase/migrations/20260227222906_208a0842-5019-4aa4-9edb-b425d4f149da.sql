-- Leeg alle user-generated data voor productie launch
-- Volgorde is belangrijk vanwege foreign keys

-- Eerst: afhankelijke tabellen
TRUNCATE TABLE public.bonus_predictions CASCADE;
TRUNCATE TABLE public.predictions CASCADE;
TRUNCATE TABLE public.pool_messages CASCADE;
TRUNCATE TABLE public.pool_members CASCADE;
TRUNCATE TABLE public.pools CASCADE;
TRUNCATE TABLE public.user_sessions CASCADE;
TRUNCATE TABLE public.user_roles CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.match_events CASCADE;
TRUNCATE TABLE public.wk_news_cache CASCADE;
TRUNCATE TABLE public.api_cache CASCADE;
TRUNCATE TABLE public.api_usage CASCADE;
TRUNCATE TABLE public.tenants CASCADE;

-- Reset match scores en status naar scheduled
UPDATE public.matches SET 
  home_score = NULL, 
  away_score = NULL, 
  status = 'scheduled', 
  needs_recalc = false, 
  points_calculated_at = NULL,
  last_updated = now();