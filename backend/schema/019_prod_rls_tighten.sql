-- 019_prod_rls_tighten.sql
-- Epic 10.4 — PROD ONLY. Documentation copy of supabase/migrations/0006_prod_rls_tighten.sql
-- Do NOT apply to tuparties-dev (intentionally open; see DEV_NEVER_PROMOTE.md).
-- Apply after 10.1 cutover migrations and after 10.2 anon endpoints are deployed.
--
-- Locked decisions:
--   * Keep RLS ON all public tables
--   * Revoke excess anon/authenticated table DML grants
--   * anon/authenticated SELECT on parties only (RLS: approved rows)
--   * Drop authenticated INSERT-on-parties (creates go through FastAPI service-role)
--   * Deny-by-absence for hosts / party_going / user_profiles; keep deny-all on party_ratings
--   * Add parties to supabase_realtime for live going counts
--   * Fix posters mime typo wenp → webp
--
-- WARNING: Never ENABLE ROW LEVEL SECURITY without SELECT policies already in place
-- (would lock out PostgREST/realtime). Prod already has RLS ON + approved SELECT.

-- ---------------------------------------------------------------------------
-- 1) Drop client INSERT path on parties (service_role bypasses RLS for API creates)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can insert parties" ON public.parties;

-- ---------------------------------------------------------------------------
-- 2) Least-privilege grants: revoke broad DML, grant SELECT on parties only
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.parties FROM anon, authenticated;
REVOKE ALL ON TABLE public.party_going FROM anon, authenticated;
REVOKE ALL ON TABLE public.party_ratings FROM anon, authenticated;
REVOKE ALL ON TABLE public.hosts FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_profiles FROM anon, authenticated;

GRANT SELECT ON TABLE public.parties TO anon, authenticated;

-- Existing policy "Public can read approved parties" continues to filter rows.
-- No GRANT on other tables → PostgREST cannot read/write them as anon/authenticated
-- (deny-by-absence). party_ratings also keeps its deny-all policy if present.

-- ---------------------------------------------------------------------------
-- 3) Realtime: publish parties so going_count updates reach the anon client
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'parties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Storage: fix posters mime typo (wenp → webp) if present
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'posters';
