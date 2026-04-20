-- Rollback for 007_host_constraints.sql.
-- Drops every constraint, trigger, and function that 007 added, in reverse order.
-- Safe to run multiple times (IF EXISTS everywhere).
--
-- Use this if 007 misbehaves in prod and you need to get back to the 006 baseline
-- without touching data. Does NOT touch 006: the `hosts` table, `parties.host_codes`
-- column, and the `get_host_rankings()` RPC all remain intact.

-- Triggers first (they depend on the functions).
DROP TRIGGER IF EXISTS hosts_code_delete_guard_trg ON hosts;
DROP TRIGGER IF EXISTS parties_host_codes_fk_trg ON parties;

-- Then the trigger functions.
DROP FUNCTION IF EXISTS hosts_code_delete_guard();
DROP FUNCTION IF EXISTS parties_host_codes_fk_check();

-- Then the table constraints.
ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_host_codes_clean_chk;
ALTER TABLE hosts   DROP CONSTRAINT IF EXISTS hosts_display_name_nonempty_chk;
ALTER TABLE hosts   DROP CONSTRAINT IF EXISTS hosts_display_name_unique;
ALTER TABLE hosts   DROP CONSTRAINT IF EXISTS hosts_code_format_chk;
