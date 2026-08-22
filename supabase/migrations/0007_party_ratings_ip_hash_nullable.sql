-- Ratings are account-keyed (user_id) after Epic 10. ip_hash is leftover from
-- the anonymous IP era and is no longer written. Leaving it NOT NULL made every
-- POST /ratings/{id} insert fail (SQLSTATE 23502), so thumbs never filled.

ALTER TABLE public.party_ratings
  ALTER COLUMN ip_hash DROP NOT NULL;

COMMENT ON COLUMN public.party_ratings.ip_hash IS
  'Legacy anonymous identity. Nullable after user_id cutover; new rows leave this NULL.';
