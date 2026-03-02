
-- Performance indexes for predictions table
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_id ON public.predictions(pool_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_pool ON public.predictions(user_id, pool_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_user ON public.predictions(match_id, user_id);

-- Performance indexes for matches table
CREATE INDEX IF NOT EXISTS idx_matches_kickoff_utc ON public.matches(kickoff_utc);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- Performance indexes for pool_members
CREATE INDEX IF NOT EXISTS idx_pool_members_user_id ON public.pool_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool_id ON public.pool_members(pool_id);

-- Performance index for bonus_predictions
CREATE INDEX IF NOT EXISTS idx_bonus_predictions_pool_user ON public.bonus_predictions(pool_id, user_id);
