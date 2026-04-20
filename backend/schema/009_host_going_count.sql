-- SUPERSEDED by 013 — kept as dev iteration history, NOT run on prod.
-- The end-state RPC lives in 013_host_wilson_stronger_going.sql.
-- See host_rating.md § "Sort formula evolution" for context.
--
-- Add total_going_count to the By Hosts leaderboard.
-- Sums going_count across every party a host has thrown, so the leaderboard
-- row can show "this host has drawn N total attendees."
--
-- Same DROP-then-CREATE dance as 008: Postgres won't let CREATE OR REPLACE
-- change the return signature (we're adding a column), so we drop first.
-- Safe: the function has no dependents beyond `supabase.rpc("get_host_rankings")`
-- on the backend.

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
    ORDER BY bayesian_score DESC, ha.parties_hosted DESC;
$$;
