-- Epic 2 CUTOVER (⚠️ BREAKING for live v1)
-- Do NOT apply to prod until Epic 10.1.
-- Safe to write/test on tuparties-dev only.
--
-- Makes going_count trigger-maintained from party_going rows.
-- Conflicts with v1 anon inc/dec endpoints that write going_count directly.

CREATE OR REPLACE FUNCTION public.sync_party_going_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_party_id uuid;
BEGIN
  target_party_id := COALESCE(NEW.party_id, OLD.party_id);
  UPDATE public.parties
  SET going_count = (
    SELECT COUNT(*)::integer
    FROM public.party_going
    WHERE party_id = target_party_id
  )
  WHERE id = target_party_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_party_going_sync_count ON public.party_going;
CREATE TRIGGER trg_party_going_sync_count
  AFTER INSERT OR DELETE ON public.party_going
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_party_going_count();

-- One-time backfill from source of truth
UPDATE public.parties p
SET going_count = COALESCE(g.cnt, 0)
FROM (
  SELECT party_id, COUNT(*)::integer AS cnt
  FROM public.party_going
  GROUP BY party_id
) g
WHERE p.id = g.party_id;

UPDATE public.parties
SET going_count = 0
WHERE id NOT IN (SELECT DISTINCT party_id FROM public.party_going WHERE party_id IS NOT NULL)
  AND going_count IS DISTINCT FROM 0;
