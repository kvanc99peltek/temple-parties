-- Strict constraints for host codes so typos and duplicates fail at insert time,
-- not silently split the leaderboard.
--
-- Safe to run on empty `hosts` and all-`{}` `parties.host_codes`. If either has
-- data that violates these rules, the ALTER / trigger creation will fail — that
-- is intentional: fix the data first.

-- 1. hosts.code format: FRAT_SCHOOL_NNN
--    - FRAT:   1–6 uppercase letters (A–Z)
--    - SCHOOL: 1–6 uppercase letters (A–Z)
--    - NNN:    exactly 3 digits (leading zeros ok)
--    Examples: PHIKAP_TEMPLE_001, SAE_PENN_042
ALTER TABLE hosts
    ADD CONSTRAINT hosts_code_format_chk
        CHECK (code ~ '^[A-Z]{1,6}_[A-Z]{1,6}_[0-9]{3}$');

-- 2. hosts.display_name: unique, trimmed, non-empty.
ALTER TABLE hosts
    ADD CONSTRAINT hosts_display_name_unique UNIQUE (display_name);

ALTER TABLE hosts
    ADD CONSTRAINT hosts_display_name_nonempty_chk
        CHECK (char_length(btrim(display_name)) > 0);

-- 3. parties.host_codes: no NULL elements, no empty strings.
-- (Duplicate and FK checks live in the trigger below — Postgres disallows
-- subqueries in CHECK constraints, so we can't use DISTINCT here.)
ALTER TABLE parties
    ADD CONSTRAINT parties_host_codes_clean_chk
        CHECK (
            host_codes IS NULL
            OR (
                NOT (host_codes && ARRAY[NULL]::TEXT[])
                AND NOT ('' = ANY (host_codes))
            )
        );

-- 4. Trigger enforces: no within-array duplicates, and every entry must
-- reference an existing hosts.code (array-style foreign key).
CREATE OR REPLACE FUNCTION parties_host_codes_fk_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    missing TEXT[];
BEGIN
    IF NEW.host_codes IS NULL OR cardinality(NEW.host_codes) = 0 THEN
        RETURN NEW;
    END IF;

    -- Reject duplicates within the array (e.g. {PHIKAP_TEMPLE_001, PHIKAP_TEMPLE_001}).
    IF (SELECT COUNT(DISTINCT c) FROM unnest(NEW.host_codes) AS c) <> cardinality(NEW.host_codes) THEN
        RAISE EXCEPTION 'parties.host_codes contains duplicate entries: %', NEW.host_codes
            USING ERRCODE = 'check_violation';
    END IF;

    -- Reject entries not present in hosts.code.
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
$$;

DROP TRIGGER IF EXISTS parties_host_codes_fk_trg ON parties;
CREATE TRIGGER parties_host_codes_fk_trg
    BEFORE INSERT OR UPDATE OF host_codes ON parties
    FOR EACH ROW
    EXECUTE FUNCTION parties_host_codes_fk_check();

-- 5. If a host is deleted, block deletion while any party still references its code.
-- (Mirrors an ON DELETE RESTRICT foreign key.)
CREATE OR REPLACE FUNCTION hosts_code_delete_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM parties WHERE OLD.code = ANY (host_codes)
    ) THEN
        RAISE EXCEPTION 'cannot delete hosts.code % — referenced by parties.host_codes', OLD.code
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS hosts_code_delete_guard_trg ON hosts;
CREATE TRIGGER hosts_code_delete_guard_trg
    BEFORE DELETE ON hosts
    FOR EACH ROW
    EXECUTE FUNCTION hosts_code_delete_guard();
