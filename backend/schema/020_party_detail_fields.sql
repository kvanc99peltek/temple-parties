-- 020_party_detail_fields.sql
-- Party detail page fields: end time, external ticket URL, per-party promo.
-- Applied to tuparties-dev 2026-08-17. Prod: owner applies later.

ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS doors_close text,
  ADD COLUMN IF NOT EXISTS external_ticket_url text,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_label text,
  ADD COLUMN IF NOT EXISTS promo_hint text;
