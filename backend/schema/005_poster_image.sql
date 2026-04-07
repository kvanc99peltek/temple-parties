-- Add poster_image column to parties table
-- Stores a URL to the party poster/flyer image
ALTER TABLE parties ADD COLUMN IF NOT EXISTS poster_image TEXT;
