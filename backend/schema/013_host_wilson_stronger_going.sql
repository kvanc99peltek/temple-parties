-- Bump the going-count multiplier from 0.05 to 0.15.
--
-- With 0.05, a host with 2 parties at 63% (Wilson ~0.44, nudge ~0.095 → 0.53)
-- was beating hosts with 4 parties + 500+ going at 47% (Wilson ~0.32,
-- nudge ~0.135 → 0.46). In a party leaderboard, showing up and pulling a
-- crowd should matter more than the Reddit-comment default suggests.
--
-- 0.15 makes the nudge ~3x stronger: 100 going adds +0.30, 1000 adds +0.45.
-- A host with 4 parties and big crowds now clears a small host with slightly
-- better ratings.
--
-- Everything else (Wilson formula, eligibility floor, source from parties
-- table as in 012, sort order) stays identical.

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
               w.wilson_lb + 0.15 * LOG(10, 1 + w.total_going_count),
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