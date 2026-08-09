-- Epic 2 safe-early: profile/party columns + hot-path indexes
-- Additive — safe for live v1. Apply to dev first; owner applies to prod.

-- 2.1 user_profiles extensions (all nullable)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS school_year text,
  ADD COLUMN IF NOT EXISTS greek_life text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2.2 parties extensions (nullable, display-only for ticket_price)
ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ticket_price text;

-- 2.3 hot-path indexes
CREATE INDEX IF NOT EXISTS idx_parties_weekend_of ON public.parties (weekend_of);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.parties (status);
