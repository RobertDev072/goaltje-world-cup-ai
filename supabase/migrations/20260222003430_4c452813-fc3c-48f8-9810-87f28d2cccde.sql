
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pools_invite_code ON public.pools(invite_code);
CREATE INDEX IF NOT EXISTS idx_predictions_pool_user_match ON public.predictions(pool_id, user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool_user ON public.pool_members(pool_id, user_id);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff_status ON public.matches(kickoff_utc, status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_login ON public.user_sessions(user_id, login_at_utc);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);
