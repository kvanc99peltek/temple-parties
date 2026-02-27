-- Add party ratings table and denormalized rating columns on parties
-- Applied to production; run this on any new Supabase project after 001_baseline.sql

-- Denormalized rating cache on parties
ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS avg_rating  NUMERIC(4, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- One row per (party, IP hash) — allows updating but not duplicate ratings
CREATE TABLE IF NOT EXISTS party_ratings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id   UUID NOT NULL REFERENCES parties (id) ON DELETE CASCADE,
    ip_hash    TEXT NOT NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (party_id, ip_hash)
);
