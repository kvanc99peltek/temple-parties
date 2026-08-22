-- 024_party_ratings_ip_hash_nullable.sql
-- Mirror of supabase/migrations/0007_party_ratings_ip_hash_nullable.sql
--
-- Ratings are account-keyed (user_id) after Epic 10. The insert path no longer
-- writes ip_hash, but the column was still NOT NULL from the anonymous-IP era,
-- so every POST /ratings/{id} failed with SQLSTATE 23502 and the client rolled
-- back the optimistic thumb/count.

ALTER TABLE public.party_ratings
  ALTER COLUMN ip_hash DROP NOT NULL;

COMMENT ON COLUMN public.party_ratings.ip_hash IS
  'Legacy anonymous identity. Nullable after user_id cutover; new rows leave this NULL.';
