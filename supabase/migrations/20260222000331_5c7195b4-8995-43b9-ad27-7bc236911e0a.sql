
-- Add description, privacy, prize_text to pools
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'private';
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS prize_text text;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_unique ON public.predictions (pool_id, user_id, match_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_members_unique ON public.pool_members (pool_id, user_id);

-- Add foreign key from pool_members to profiles for easy joins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pool_members_user_id_fkey') THEN
    ALTER TABLE public.pool_members ADD CONSTRAINT pool_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from predictions to profiles for easy joins  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'predictions_user_id_fkey') THEN
    ALTER TABLE public.predictions ADD CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
