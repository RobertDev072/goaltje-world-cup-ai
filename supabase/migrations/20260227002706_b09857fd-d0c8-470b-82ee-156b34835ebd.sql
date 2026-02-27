CREATE TABLE public.wk_news_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours')
);

-- Index for quick lookups
CREATE INDEX idx_wk_news_cache_expires ON public.wk_news_cache(expires_at);
CREATE INDEX idx_wk_news_cache_match ON public.wk_news_cache(match_id);

-- Allow public read access
ALTER TABLE public.wk_news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news" ON public.wk_news_cache FOR SELECT USING (true);
CREATE POLICY "Service role can manage news" ON public.wk_news_cache FOR ALL USING (true) WITH CHECK (true);