-- Epic 2 CUTOVER (⚠️ BREAKING for live v1)
-- Do NOT apply to prod until Epic 10.1.
-- Safe to write/test on tuparties-dev only.
--
-- Adds user_id identity for party_ratings. Keeps ip_hash rows as history.
-- Unique (party_id, user_id) for authenticated ratings; old UNIQUE(party_id, ip_hash) remains.

ALTER TABLE public.party_ratings
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Prefer user_profiles FK when present (dev); otherwise auth.users (prod-shaped DBs).
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

COMMENT ON COLUMN public.party_ratings.user_id IS
  'Auth-keyed rater identity (v2). ip_hash remains for anonymous/historical rows.';
COMMENT ON COLUMN public.party_ratings.ip_hash IS
  'Legacy anonymous identity. Retained as history; new writes should prefer user_id after cutover.';
