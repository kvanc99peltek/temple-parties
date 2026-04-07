-- Migration: Convert 5-star ratings to binary thumbs up/down system
-- Maps avg_rating (1-5) to like_percentage (0-100%) using: (avg - 1) / 4 * 100
-- Converts individual ratings to binary: >= 3 → 1 (liked), <= 2 → 0 (disliked)

-- Step 1: Add like_percentage column to parties
ALTER TABLE parties ADD COLUMN IF NOT EXISTS like_percentage NUMERIC(5,2) DEFAULT 0;

-- Step 2: Compute like_percentage from avg_rating BEFORE dropping it
-- Maps 1.0 → 0%, 3.0 → 50%, 5.0 → 100%
UPDATE parties SET like_percentage = ROUND((avg_rating - 1) / 4.0 * 100, 2)
WHERE avg_rating > 0;

-- Step 3: Drop old avg_rating column
ALTER TABLE parties DROP COLUMN IF EXISTS avg_rating;

-- Step 4: Convert individual ratings from 1-5 to binary 0/1
ALTER TABLE party_ratings DROP CONSTRAINT IF EXISTS party_ratings_rating_check;
UPDATE party_ratings SET rating = CASE WHEN rating >= 3 THEN 1 ELSE 0 END;
ALTER TABLE party_ratings ADD CONSTRAINT party_ratings_rating_check CHECK (rating IN (0, 1));
