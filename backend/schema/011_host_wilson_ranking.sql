-- SUPERSEDED by 013 — kept as dev iteration history, NOT run on prod.
-- The end-state RPC lives in 013_host_wilson_stronger_going.sql.
-- See host_rating.md § "Sort formula evolution" for context.
--
-- Wilson lower-bound ranking for the By Hosts leaderboard, plus a small
-- logarithmic nudge for going count.
--
-- Replaces 010's "sort by total going count" approach. Wilson lower bound
-- at 95% confidence penalizes small samples from first principles: a host
-- with 8 likes / 0 dislikes gets a lower bound of ~0.675, while a host with
-- 80 likes / 20 dislikes gets ~0.712 — even though the raw avg of the first
-- is higher.
--
-- Formula per host (aggregating across all approved, host-tagged parties):
--   n = total_likes + total_dislikes
--   p = total_likes / n
--   z = 1.96
--   wilson_lb = (p + z²/(2n) - z*sqrt((p(1-p) + z²/(4n))/n)) / (1 + z²/n)
--   final_score = wilson_lb + 0.05 * log10(1 + total_going_count)
--
-- Eligibility floor (must pass both to sit in the ranked group; failing
-- hosts are returned but pushed to the bottom and dimmed on the frontend):
--   parties_hosted >= 2  AND  total_rating_count >= 15
--
-- Sort: is_eligible DESC, final_score DESC, total_going_count DESC.
--
-- Likes/dislikes pulled from party_ratings (source of truth — ratings are
-- IN (0,1) per 004_binary_ratings.sql). No rounding risk.
--
-- bayesian_score is still computed for continuity/debugging; no longer the
-- sort key.
--
-- Signature change (new final_score, is_eligible columns) → DROP+CREATE.

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
               p.id                 AS party_id,
               p.like_percentage,
               p.rating_count,
               p.going_count
        FROM parties p
        WHERE p.status = 'approved'
          AND p.host_codes IS NOT NULL
          AND array_length(p.host_codes, 1) > 0
    ),
    party_ld AS (
        SELECT hp.host_code,
               hp.party_id,
               hp.going_count,
               COALESCE(SUM(pr.rating), 0)::BIGINT                     AS likes,
               COALESCE(COUNT(pr.*) - SUM(pr.rating), 0)::BIGINT       AS dislikes
        FROM host_parties hp
        LEFT JOIN party_ratings pr ON pr.party_id = hp.party_id
        GROUP BY hp.host_code, hp.party_id, hp.going_count
    ),
    host_agg AS (
        SELECT host_code,
               COUNT(*)::BIGINT                         AS parties_hosted,
               COALESCE(SUM(likes), 0)::BIGINT          AS total_likes,
               COALESCE(SUM(dislikes), 0)::BIGINT       AS total_dislikes,
               COALESCE(SUM(going_count), 0)::BIGINT    AS total_going_count
        FROM party_ld
        GROUP BY host_code
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
    -- bayesian_score kept for continuity. Uses the same global weighted mean
    -- as 008 so existing debug queries still work.
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
