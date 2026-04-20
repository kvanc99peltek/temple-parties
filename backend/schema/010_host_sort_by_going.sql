-- SUPERSEDED by 013 — kept as dev iteration history, NOT run on prod.
-- The end-state RPC lives in 013_host_wilson_stronger_going.sql.
-- See host_rating.md § "Sort formula evolution" for context.
--
-- Change the By Hosts leaderboard sort to total_going_count DESC.
-- At this stage there aren't enough ratings per host for a weighted/Bayesian
-- avg to stabilize — hosts with a single lucky party still outrank hosts with
-- a strong body of work. Total going count is a more direct, less gameable
-- signal of "who actually pulls a crowd" and matches how users think about
-- host reputation in practice.
--
-- The Bayesian math stays computed in the RPC (cheap, and easy to flip back
-- to bayesian_score DESC later). Only the ORDER BY changes. The leaderboard
-- row still displays avg_like_percentage as the host's %; it's just no longer
-- the sort key.
--
-- Safe re-run: DROP then CREATE (return signature unchanged from 009, but
-- using DROP keeps this migration self-contained).

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
    bayesian_score        NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    WITH host_parties AS (
        SELECT unnest(p.host_codes) AS host_code,
               p.like_percentage,
               p.rating_count,
               p.going_count
        FROM parties p
        WHERE p.status = 'approved'
          AND p.host_codes IS NOT NULL
          AND array_length(p.host_codes, 1) > 0
          AND p.rating_count > 0
    ),
    global AS (
        SELECT
            CASE
                WHEN COALESCE(SUM(rating_count), 0) = 0 THEN 0
                ELSE SUM(like_percentage * rating_count)::NUMERIC
                     / SUM(rating_count)::NUMERIC
            END AS global_mean
        FROM host_parties
    ),
    host_agg AS (
        SELECT hp.host_code,
               COUNT(*)::BIGINT AS parties_hosted,
               COALESCE(SUM(hp.rating_count), 0)::BIGINT AS total_rating_count,
               COALESCE(SUM(hp.going_count), 0)::BIGINT AS total_going_count,
               CASE
                   WHEN COALESCE(SUM(hp.rating_count), 0) = 0 THEN 0
                   ELSE SUM(hp.like_percentage * hp.rating_count)::NUMERIC
                        / SUM(hp.rating_count)::NUMERIC
               END AS raw_avg
        FROM host_parties hp
        GROUP BY hp.host_code
    )
    SELECT h.code AS host_code,
           h.display_name,
           h.logo_url,
           ha.parties_hosted,
           ha.total_rating_count,
           ha.total_going_count,
           ROUND(ha.raw_avg, 2) AS avg_like_percentage,
           ROUND(
               (ha.raw_avg * ha.parties_hosted + g.global_mean * 3)
               / (ha.parties_hosted + 3),
               2
           ) AS bayesian_score
    FROM host_agg ha
    JOIN hosts h ON h.code = ha.host_code
    CROSS JOIN global g
    ORDER BY ha.total_going_count DESC, ha.raw_avg DESC;
$$;
