
-- 1. Create all tables first (no policies yet)

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#10B981',
  secondary_color TEXT DEFAULT '#F59E0B',
  allowed_email_domain TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  "group" TEXT,
  flag_url TEXT,
  external_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 6)),
  scoring_rules_json JSONB DEFAULT '{"exact": 5, "result": 3, "goal_diff": 2}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pool_id, user_id)
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  stage TEXT NOT NULL DEFAULT 'group',
  "group" TEXT,
  kickoff_utc TIMESTAMPTZ NOT NULL,
  venue TEXT,
  home_team_id UUID REFERENCES public.teams(id),
  away_team_id UUID REFERENCES public.teams(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  minute INTEGER,
  type TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  player_name TEXT,
  detail_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  home_pred INTEGER,
  away_pred INTEGER,
  winner_pred UUID REFERENCES public.teams(id),
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pool_id, user_id, match_id)
);

-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- 3. Helper function to check pool membership (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_pool_member(_user_id UUID, _pool_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pool_members WHERE user_id = _user_id AND pool_id = _pool_id
  );
$$;

-- 4. RLS Policies

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tenants
CREATE POLICY "Tenants are viewable" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Authenticated can create tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator can update tenant" ON public.tenants FOR UPDATE USING (auth.uid() = created_by);

-- Teams
CREATE POLICY "Teams are public" ON public.teams FOR SELECT USING (true);

-- Pools
CREATE POLICY "Pools are viewable" ON public.pools FOR SELECT USING (true);
CREATE POLICY "Authenticated can create pools" ON public.pools FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Pool creator can update" ON public.pools FOR UPDATE USING (auth.uid() = created_by);

-- Pool members
CREATE POLICY "Pool members viewable by members" ON public.pool_members FOR SELECT USING (public.is_pool_member(auth.uid(), pool_id));
CREATE POLICY "Authenticated can join pools" ON public.pool_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can leave" ON public.pool_members FOR DELETE USING (auth.uid() = user_id);

-- Matches
CREATE POLICY "Matches are public" ON public.matches FOR SELECT USING (true);

-- Match events
CREATE POLICY "Match events are public" ON public.match_events FOR SELECT USING (true);

-- Predictions
CREATE POLICY "View predictions in own pools" ON public.predictions FOR SELECT USING (public.is_pool_member(auth.uid(), pool_id));
CREATE POLICY "Insert own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

-- 5. Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Indexes
CREATE INDEX idx_pool_members_pool ON public.pool_members(pool_id);
CREATE INDEX idx_pool_members_user ON public.pool_members(user_id);
CREATE INDEX idx_matches_kickoff ON public.matches(kickoff_utc);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_predictions_pool_user ON public.predictions(pool_id, user_id);
CREATE INDEX idx_match_events_match ON public.match_events(match_id);
CREATE INDEX idx_pools_invite_code ON public.pools(invite_code);
