# 004 Binary Ratings Migration Guide (Prod)

## What this migration does
- Converts the 5-star rating system to binary thumbs up/down
- Maps existing `avg_rating` (1-5 scale) to `like_percentage` (0-100% scale)
- Converts individual `party_ratings.rating` values from 1-5 to 0/1
- Drops the `avg_rating` column from `parties`

## Pre-migration checklist
- [ ] Deploy the new backend code to Railway FIRST (it reads `like_percentage`, not `avg_rating`)
- [ ] Confirm the backend is running but expect rating-related endpoints to error until migration completes — this is OK since the column won't exist yet
- [ ] Pick a low-traffic window (NOT during a party night). Ideal: weekday afternoon
- [ ] Back up the `parties` and `party_ratings` tables (Supabase dashboard > Table Editor > Export CSV for both)

## Steps — Run in Supabase SQL Editor (prod)

Run each step individually. Do NOT paste all steps at once. Wait for "Success" after each one before proceeding.

### Step 1: Add like_percentage column
```sql
ALTER TABLE parties ADD COLUMN IF NOT EXISTS like_percentage NUMERIC(5,2) DEFAULT 0;
```
**Verify:** Go to Table Editor > `parties` and confirm `like_percentage` column exists with default `0.00`.

### Step 2: Compute like_percentage from avg_rating
```sql
UPDATE parties SET like_percentage = ROUND((avg_rating - 1) / 4.0 * 100, 2)
WHERE avg_rating > 0;
```
**Verify:** Run this query and spot-check the values make sense:
```sql
SELECT title, avg_rating, like_percentage, rating_count
FROM parties WHERE rating_count > 0
ORDER BY like_percentage DESC LIMIT 10;
```
Expected: avg_rating 4.4 maps to ~85%, avg_rating 2.2 maps to ~30%.

### Step 3: Drop avg_rating column
```sql
ALTER TABLE parties DROP COLUMN IF EXISTS avg_rating;
```
**Verify:** Refresh Table Editor > `parties` and confirm `avg_rating` is gone, `like_percentage` is still there.

### Step 4: Drop old rating constraint
```sql
ALTER TABLE party_ratings DROP CONSTRAINT IF EXISTS party_ratings_rating_check;
```

### Step 5: Convert individual ratings to binary
```sql
UPDATE party_ratings SET rating = CASE WHEN rating >= 3 THEN 1 ELSE 0 END;
```
**Verify:** Run this and confirm no values outside 0/1:
```sql
SELECT DISTINCT rating FROM party_ratings ORDER BY rating;
```
Expected result: only `0` and `1`.

### Step 6: Add new constraint
```sql
ALTER TABLE party_ratings ADD CONSTRAINT party_ratings_rating_check CHECK (rating IN (0, 1));
```

---

# 005 Poster Image Migration Guide (Prod)

## What this migration does
- Adds a `poster_image` TEXT column to the `parties` table
- Stores URLs to party poster/flyer images hosted in Supabase Storage

## Pre-migration checklist
- [ ] Ensure the Supabase Storage bucket `posters` exists and is set to public
- [ ] No downtime required — this is a non-destructive additive change
- [ ] Can be run at any time, no traffic window needed

## Steps — Run in Supabase SQL Editor (prod)

### Step 1: Add poster_image column
```sql
ALTER TABLE parties ADD COLUMN IF NOT EXISTS poster_image TEXT;
```
**Verify:** Go to Table Editor > `parties` and confirm `poster_image` column exists (nullable, no default).

## Post-migration checklist
- [ ] Open the app and check party cards — parties without poster images should show the gradient fallback
- [ ] Upload a poster image via Supabase Storage > `posters` bucket, copy the public URL, and set it on a party row
- [ ] Confirm the image renders on the party card in the frontend

## Rollback
```sql
ALTER TABLE parties DROP COLUMN IF EXISTS poster_image;
```

---

## Post-migration checklist (004)
- [ ] Open the app and check the Rankings page — percentages should look reasonable (no 100%/0% extremes)
- [ ] Try submitting a new thumbs up/down rating on a party — confirm it works
- [ ] Check the home feed — party cards should show the thumbs up/down UI

## Rollback plan (if something goes wrong)

### If Step 3 hasn't run yet (avg_rating still exists):
```sql
ALTER TABLE parties DROP COLUMN IF EXISTS like_percentage;
```
Then redeploy the old backend code.

### If Step 3 already ran (avg_rating is gone):
You'll need to restore from the CSV backup you took. In SQL Editor:
```sql
ALTER TABLE parties ADD COLUMN avg_rating NUMERIC(4,2) DEFAULT 0;
ALTER TABLE parties DROP COLUMN IF EXISTS like_percentage;
```
Then re-import the parties CSV backup via Table Editor.

For `party_ratings`, if Step 5 already ran and you need to revert:
```sql
ALTER TABLE party_ratings DROP CONSTRAINT IF EXISTS party_ratings_rating_check;
```
Delete all rows and re-import the party_ratings CSV backup, then:
```sql
ALTER TABLE party_ratings ADD CONSTRAINT party_ratings_rating_check CHECK (rating BETWEEN 1 AND 5);
```
