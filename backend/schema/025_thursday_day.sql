-- 025_thursday_day.sql
-- Parties can happen Thursday, Friday, or Saturday of a weekend (still
-- keyed by weekend_of = that Friday). Apply in the Supabase dashboard,
-- then keep this file as the record.
--
-- day and weekend_of remain DERIVED from parties.date by the backend
-- (day_and_weekend in app/services/weekend.py).

ALTER TABLE public.parties
  DROP CONSTRAINT IF EXISTS parties_day_check;

ALTER TABLE public.parties
  ADD CONSTRAINT parties_day_check
  CHECK (((day)::text = ANY ((ARRAY[
    'thursday'::character varying,
    'friday'::character varying,
    'saturday'::character varying
  ])::text[])));
