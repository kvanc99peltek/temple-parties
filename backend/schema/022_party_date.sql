-- 022_party_date.sql
-- The parties.date column (the actual calendar date a party happens on).
-- Dev got this column straight through the dashboard long ago and it was never
-- recorded here, so it silently missed prod. POST /parties inserts "date", so
-- every prod create-party attempt failed with PGRST204 ("Could not find the
-- 'date' column of 'parties' in the schema cache") until this was applied.
-- Already in tuparties-dev (predates the 0000 baseline capture).
-- Applied to prod 2026-08-18 as part of the create-party outage fix.
--
-- Note: "day" ('friday'/'saturday') and "weekend_of" (the keying Friday) are
-- both DERIVED from this date by the backend (_day_and_weekend in
-- routers/parties.py). This column is the source the other two come from.

ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS date date;
