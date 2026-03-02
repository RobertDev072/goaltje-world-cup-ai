
-- Add unique constraint on cache_key for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_cache_cache_key_key'
  ) THEN
    ALTER TABLE public.api_cache ADD CONSTRAINT api_cache_cache_key_key UNIQUE (cache_key);
  END IF;
END $$;
