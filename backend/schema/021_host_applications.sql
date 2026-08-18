-- 021_host_applications.sql
-- Become-a-host applications + is_host gate on posting.
-- Applied to tuparties-dev 2026-08-17. Prod: owner applies later.
-- Instagram DM proof is manual (admin HQ). This table is the queue.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_host boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.host_applications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.user_profiles(id),
    org_type    text NOT NULL CHECK (org_type IN ('frat', 'house', 'other')),
    org_name    text NOT NULL,
    instagram   text NOT NULL,
    address     text NOT NULL,
    status      text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES public.user_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_host_applications_user_id
  ON public.host_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_host_applications_status
  ON public.host_applications (status);

-- One open application at a time. Rejected users may apply again.
CREATE UNIQUE INDEX IF NOT EXISTS idx_host_applications_one_pending
  ON public.host_applications (user_id)
  WHERE status = 'pending';

-- Anyone who already listed a party on this project is a host.
UPDATE public.user_profiles
SET is_host = true
WHERE id IN (
  SELECT DISTINCT created_by
  FROM public.parties
  WHERE created_by IS NOT NULL
);
