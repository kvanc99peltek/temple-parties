-- Host codes and By-Hosts leaderboard support.
-- Adds a hosts lookup table, a host_codes array on parties for co-host support,
-- and an RPC that aggregates parties into a rating-count-weighted host leaderboard.

CREATE TABLE IF NOT EXISTS hosts (
    code         VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(60) NOT NULL,
    logo_url     TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS host_codes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS parties_host_codes_gin
    ON parties USING GIN (host_codes);

CREATE OR REPLACE FUNCTION get_host_rankings()
RETURNS TABLE (
    host_code             VARCHAR,
    display_name          VARCHAR,
    logo_url              TEXT,
    parties_hosted        BIGINT,
    total_rating_count    BIGINT,
    avg_like_percentage   NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    WITH host_parties AS (
        SELECT unnest(p.host_codes) AS host_code,
               p.like_percentage,
               p.rating_count
        FROM parties p
        WHERE p.status = 'approved'
          AND p.host_codes IS NOT NULL
          AND array_length(p.host_codes, 1) > 0
    )
    SELECT h.code AS host_code,
           h.display_name,
           h.logo_url,
           COUNT(*)::BIGINT AS parties_hosted,
           COALESCE(SUM(hp.rating_count), 0)::BIGINT AS total_rating_count,
           CASE
               WHEN COALESCE(SUM(hp.rating_count), 0) = 0 THEN 0
               ELSE ROUND(
                   SUM(hp.like_percentage * hp.rating_count)::NUMERIC
                   / SUM(hp.rating_count)::NUMERIC,
                   2
               )
           END AS avg_like_percentage
    FROM host_parties hp
    JOIN hosts h ON h.code = hp.host_code
    GROUP BY h.code, h.display_name, h.logo_url
    ORDER BY avg_like_percentage DESC, parties_hosted DESC;
$$;
