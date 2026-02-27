-- Add is_verified column to parties
-- Applied to production; run this on any new Supabase project after 002_party_ratings.sql

ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
