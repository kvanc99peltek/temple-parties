-- 014_v2_safe_early_columns_indexes.sql
-- Documentation copy of supabase/migrations/0001_v2_safe_early_columns_indexes.sql
-- Applied to tuparties-dev 2026-08-07 (Epic 2.1–2.3). Prod: owner applies later.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS school_year text,
  ADD COLUMN IF NOT EXISTS greek_life text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ticket_price text;

CREATE INDEX IF NOT EXISTS idx_parties_weekend_of ON public.parties (weekend_of);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.parties (status);
