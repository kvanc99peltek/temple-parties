-- 0000_baseline_prod.sql
-- Captured from live PROD (owner SQL dumps) — 2026-08-06
--
-- INTENT: document PROD reality as a sibling to 0000_baseline_dev.sql.
-- Do NOT re-apply blindly. Capture / reference only — not an apply-to-prod migration.
-- Detailed security review notes are local-only (not in this public repo).

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE public.hosts (
  code character varying(20) NOT NULL,
  display_name character varying(60) NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.parties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying(50) NOT NULL,
  host character varying(30) NOT NULL,
  category character varying(50) NOT NULL,
  day character varying(10) NOT NULL,
  doors_open character varying(20) NOT NULL,
  address character varying(500) NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  going_count integer DEFAULT 0,
  created_by uuid,
  status character varying(20) DEFAULT 'pending'::character varying,
  weekend_of date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  rating_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  pin_label text,
  like_percentage numeric(5,2) DEFAULT 0,
  poster_image text,
  host_codes text[] DEFAULT '{}'::text[]
);

CREATE TABLE public.party_going (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  party_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.party_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL,
  ip_hash character varying(64) NOT NULL,
  rating smallint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  username character varying(20),
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  email character varying
);

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

ALTER TABLE ONLY public.hosts
  ADD CONSTRAINT hosts_pkey PRIMARY KEY (code);
ALTER TABLE ONLY public.hosts
  ADD CONSTRAINT hosts_display_name_unique UNIQUE (display_name);
ALTER TABLE ONLY public.hosts
  ADD CONSTRAINT hosts_code_format_chk CHECK (((code)::text ~ '^[A-Z]{1,6}_[A-Z]{1,6}_[0-9]{3}$'::text));
ALTER TABLE ONLY public.hosts
  ADD CONSTRAINT hosts_display_name_nonempty_chk CHECK ((char_length(btrim((display_name)::text)) > 0));

ALTER TABLE ONLY public.parties
  ADD CONSTRAINT parties_pkey PRIMARY KEY (id);
-- PROD: created_by → auth.users (dev points at user_profiles)
ALTER TABLE ONLY public.parties
  ADD CONSTRAINT parties_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.parties
  ADD CONSTRAINT parties_day_check CHECK (((day)::text = ANY ((ARRAY['friday'::character varying, 'saturday'::character varying])::text[])));
ALTER TABLE ONLY public.parties
  ADD CONSTRAINT parties_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])));
ALTER TABLE ONLY public.parties
  ADD CONSTRAINT parties_host_codes_clean_chk CHECK (((host_codes IS NULL) OR ((NOT (host_codes && ARRAY[NULL::text])) AND (NOT (''::text = ANY (host_codes))))));

ALTER TABLE ONLY public.party_going
  ADD CONSTRAINT party_going_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.party_going
  ADD CONSTRAINT party_going_party_id_user_id_key UNIQUE (party_id, user_id);
ALTER TABLE ONLY public.party_going
  ADD CONSTRAINT party_going_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;
-- PROD: user_id → auth.users (dev points at user_profiles)
ALTER TABLE ONLY public.party_going
  ADD CONSTRAINT party_going_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.party_ratings
  ADD CONSTRAINT party_ratings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.party_ratings
  ADD CONSTRAINT party_ratings_party_id_ip_hash_key UNIQUE (party_id, ip_hash);
ALTER TABLE ONLY public.party_ratings
  ADD CONSTRAINT party_ratings_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.party_ratings
  ADD CONSTRAINT party_ratings_rating_check CHECK ((rating = ANY (ARRAY[0, 1])));

ALTER TABLE ONLY public.user_profiles
  ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_profiles
  ADD CONSTRAINT user_profiles_username_key UNIQUE (username);
ALTER TABLE ONLY public.user_profiles
  ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);

-- =============================================================================
-- INDEXES (non-constraint extras called out; PK/UNIQUE indexes implied above)
-- =============================================================================
-- NOTE: parties(weekend_of) and parties(status) indexes are ABSENT (v1 §6 gap → epic 2.3)

CREATE INDEX parties_host_codes_gin ON public.parties USING gin (host_codes);
CREATE INDEX idx_party_ratings_ip_hash ON public.party_ratings USING btree (ip_hash);
CREATE INDEX idx_party_ratings_party_id ON public.party_ratings USING btree (party_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.parties_host_codes_fk_check()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    missing TEXT[];
BEGIN
    IF NEW.host_codes IS NULL OR cardinality(NEW.host_codes) = 0 THEN
        RETURN NEW;
    END IF;

    IF (SELECT COUNT(DISTINCT c) FROM unnest(NEW.host_codes) AS c) <> cardinality(NEW.host_codes) THEN
        RAISE EXCEPTION 'parties.host_codes contains duplicate entries: %', NEW.host_codes
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT COALESCE(array_agg(c), '{}')
    INTO missing
    FROM unnest(NEW.host_codes) AS c
    WHERE c NOT IN (SELECT code FROM hosts);

    IF cardinality(missing) > 0 THEN
        RAISE EXCEPTION 'parties.host_codes references unknown hosts.code: %', missing
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hosts_code_delete_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (SELECT 1 FROM parties WHERE OLD.code = ANY (host_codes)) THEN
        RAISE EXCEPTION 'cannot delete hosts.code % — referenced by parties.host_codes', OLD.code
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_host_rankings()
 RETURNS TABLE(host_code character varying, display_name character varying, logo_url text, parties_hosted bigint, total_rating_count bigint, total_going_count bigint, avg_like_percentage numeric, bayesian_score numeric, final_score numeric, is_eligible boolean)
 LANGUAGE sql
 STABLE
AS $function$
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
$function$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER parties_host_codes_fk_trg
  BEFORE INSERT OR UPDATE OF host_codes ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.parties_host_codes_fk_check();

CREATE TRIGGER hosts_code_delete_guard_trg
  BEFORE DELETE ON public.hosts
  FOR EACH ROW EXECUTE FUNCTION public.hosts_code_delete_guard();

-- =============================================================================
-- RLS / POLICIES (captured state)
-- =============================================================================

ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_going ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
-- relforcerowsecurity = false on all five (FORCE ROW LEVEL SECURITY not set)

CREATE POLICY "Public can read approved parties"
  ON public.parties
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((status)::text = 'approved'::text));

CREATE POLICY "Authenticated can insert parties"
  ON public.parties
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "No direct access"
  ON public.party_ratings
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (false);

-- hosts / party_going / user_profiles: no policies (RLS on → deny for non-bypass roles)

-- =============================================================================
-- GRANTS (captured state — still wide open at table privilege level)
-- =============================================================================
-- anon, authenticated, and service_role each have:
--   SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
-- on every public table listed above.
-- Effective PostgREST access for anon/authenticated is gated by RLS above;
-- service_role bypasses RLS.

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO service_role;

-- =============================================================================
-- REALTIME PUBLICATION (captured state)
-- =============================================================================
-- Dump listed only `supabase_realtime_messages_publication` → realtime.messages_*
-- partitions. No public.app tables appear in any publication — frontend
-- postgres_changes on parties would be inert on PROD until a table is added, e.g.:
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
-- (Not applied here — capture only.)

-- =============================================================================
-- STORAGE (captured state — not SQL-applied here)
-- =============================================================================
-- Bucket `posters`: public=true, file_size_limit=1048576,
--   allowed_mime_types=["image/jpeg","image/wenp"]  -- note: wenp typo vs webp
-- Bucket `avatars`: absent
