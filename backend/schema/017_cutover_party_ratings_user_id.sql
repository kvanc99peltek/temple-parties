-- 017_cutover_party_ratings_user_id.sql
-- ⚠️ CUTOVER — do not apply to prod until Epic 10.1
-- Mirror of supabase/migrations/0004_cutover_party_ratings_user_id.sql

ALTER TABLE public.party_ratings
  ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'party_ratings_user_id_fkey'
  ) THEN
    ALTER TABLE public.party_ratings
      ADD CONSTRAINT party_ratings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS party_ratings_party_id_user_id_key
  ON public.party_ratings (party_id, user_id)
  WHERE user_id IS NOT NULL;
