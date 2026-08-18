-- 023_parties_created_by_to_profiles.sql
-- Repoint parties.created_by from auth.users to public.user_profiles (dev parity).
-- Applied to prod 2026-08-18. Dev already had this shape (see 0000_baseline_dev).
--
-- Why: PostgREST discovers table relationships from foreign keys, and it can
-- only see schemas it exposes (public). The admin queue query embeds the
-- creator's profile — "*, user_profiles!created_by(username, email)" in
-- routers/admin.py — which needs a FK from parties.created_by to
-- public.user_profiles. Prod's FK pointed at auth.users (invisible to
-- PostgREST), so /admin's party list failed with PGRST200
-- ("Could not find a relationship between 'parties' and 'user_profiles'").

BEGIN;

-- 1) Backfill: every auth user needs a profile row before the new FK can
--    validate. The on_auth_user_created trigger (018) only covers users
--    created after it was installed — early signups may have no profile row.
--    The old FK guarantees every non-null created_by exists in auth.users,
--    so after this insert the new FK cannot fail validation.
INSERT INTO public.user_profiles (id, email, is_admin)
SELECT u.id, u.email, false
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2) Swap the FK target. Same name, no ON DELETE clause — mirrors dev exactly.
--    Deletion semantics are unchanged: a user with parties was already
--    undeletable through the old FK; now their profile row blocks it instead.
ALTER TABLE public.parties DROP CONSTRAINT parties_created_by_fkey;
ALTER TABLE public.parties
  ADD CONSTRAINT parties_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

COMMIT;

-- Supabase reloads PostgREST's schema cache on DDL automatically; this just
-- forces it immediately so /admin recovers without waiting.
NOTIFY pgrst, 'reload schema';
