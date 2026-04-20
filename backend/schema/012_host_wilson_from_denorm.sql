-- NOT RUN on dev or prod — kept as a fallback for environments where
-- party_ratings is empty/sparse. The shipped end-state RPC lives in
-- 013_host_wilson_stronger_going.sql. See host_rating.md for context.
--
-- Fix: 011 pulled likes/dislikes from party_ratings, but on dev that table
-- is empty even though parties.like_percentage / rating_count are populated
-- (seed data was written straight to the denormalized columns). Result:
-- every host had total_rating_count=0 and was flagged ineligible.
--
-- This migration reconstructs likes/dislikes from the denormalized columns
-- per party, then aggregates per host. Lossless round-trip because ratings
-- are binary (IN (0,1)):
--     likes    = ROUND(like_percentage / 100 * rating_count)
--     dislikes = rating_count - likes
--
-- All other math (Wilson lower bound, log-going nudge, eligibility floor)
-- stays identical to 011.

DROP FUNCTION IF EXISTS get_host_rankings();

CREATE FUNCTION get_host_rankings()
RETURNS TABLE (
    host_code             VARCHAR,
    display_name          VARCHAR,
    logo_url              TEXT,
    parties_hosted        BIGINT,
    total_rating_count    BIGINT,
    total_going_count     BIGINT,
    avg_like_percentage   NUMERIC,
    bayesian_score        NUMERIC,
    final_score           NUMERIC,
    is_eligible           BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    WITH host_parties AS (
        SELECT unnest(p.host_codes) AS host_code,
               p.like_percentage,
               p.rating_count,
               p.going_count,
               -- Reconstruct binary likes/dislikes from denormalized columns.
               ROUND(
                   COALESCE(p.like_percentage, 0) / 100.0
                   * COALESCE(p.rating_count, 0)
               )::BIGINT AS likes,
               (
                   COALESCE(p.rating_count, 0)
                   - ROUND(
                       COALESCE(p.like_percentage, 0) / 100.0
                       * COALESCE(p.rating_count, 0)
                   )
               )::BIGINT AS dislikes
        FROM parties p
        WHERE p.status = 'approved'
          AND p.host_codes IS NOT NULL
          AND array_length(p.host_codes, 1) > 0
    ),
    host_agg AS (
        SELECT hp.host_code,
               COUNT(*)::BIGINT                         AS parties_hosted,
               COALESCE(SUM(hp.likes), 0)::BIGINT       AS total_likes,
               COALESCE(SUM(hp.dislikes), 0)::BIGINT    AS total_dislikes,
               COALESCE(SUM(hp.going_count), 0)::BIGINT AS total_going_count
        FROM host_parties hp
        GROUP BY hp.host_code
    ),
    wilson AS (
        SELECT ha.*,
               CASE
                 WHEN (ha.total_likes + ha.total_dislikes) = 0 THEN 0::NUMERIC
                 ELSE (
                   (ha.total_likes::NUMERIC / (ha.total_likes + ha.total_dislikes))
                   + (1.96 * 1.96) / (2.0 * (ha.total_likes + ha.total_dislikes))
                   - 1.96 * SQRT(
                       (
                         (ha.total_likes::NUMERIC / (ha.total_likes + ha.total_dislikes))
                         * (1 - ha.total_likes::NUMERIC / (ha.total_likes + ha.total_dislikes))
                         + (1.96 * 1.96) / (4.0 * (ha.total_likes + ha.total_dislikes))
                       ) / (ha.total_likes + ha.total_dislikes)
                     )
                 ) / (1 + (1.96 * 1.96) / (ha.total_likes + ha.total_dislikes))
               END AS wilson_lb
        FROM host_agg ha
    ),
    global AS (
        SELECT CASE WHEN SUM(hp.rating_count) = 0 THEN 0
                    ELSE SUM(hp.like_percentage * hp.rating_count)::NUMERIC
                         / SUM(hp.rating_count)::NUMERIC
               END AS global_mean
        FROM host_parties hp
        WHERE hp.rating_count > 0
    ),
    host_rating_agg AS (
        SELECT host_code,
               CASE WHEN SUM(rating_count) = 0 THEN 0
                    ELSE SUM(like_percentage * rating_count)::NUMERIC
                         / SUM(rating_count)::NUMERIC
               END AS raw_avg
        FROM host_parties
        WHERE rating_count > 0
        GROUP BY host_code
    )
    SELECT h.code AS host_code,
           h.display_name,
           h.logo_url,
           w.parties_hosted,
           (w.total_likes + w.total_dislikes) AS total_rating_count,
           w.total_going_count,
           ROUND(COALESCE(hra.raw_avg, 0), 2) AS avg_like_percentage,
           ROUND(
               (COALESCE(hra.raw_avg, 0) * w.parties_hosted + g.global_mean * 3)
               / (w.parties_hosted + 3),
               2
           ) AS bayesian_score,
           ROUND(
               w.wilson_lb + 0.05 * LOG(10, 1 + w.total_going_count),
               4
           ) AS final_score,
           (w.parties_hosted >= 2 AND (w.total_likes + w.total_dislikes) >= 15)
               AS is_eligible
    FROM wilson w
    JOIN hosts h ON h.code = w.host_code
    LEFT JOIN host_rating_agg hra ON hra.host_code = w.host_code
    CROSS JOIN global g
    ORDER BY is_eligible DESC,
             final_score DESC,
             w.total_going_count DESC;
$$;
