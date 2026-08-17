# Database Schema

This directory tracks the Supabase database schema in version control.

## How it works

- `001_baseline.sql` contains the initial table definitions.
- When you make a schema change in the Supabase dashboard, add a new numbered file (e.g., `002_add_column.sql`) with the SQL you ran.
- Number files sequentially so the order of changes is clear.

## Example

```sql
-- 002_add_avatar_url.sql
ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
```

## Notes

- These files are documentation, not auto-applied migrations. Run them manually against Supabase if setting up a new project.
- Always test schema changes on a branch/staging project before applying to production.
- Epic 10.4 prod RLS tighten: `019_prod_rls_tighten.sql` (mirror `supabase/migrations/0006_prod_rls_tighten.sql`) — **prod only**; see `specs/version2/epic-10-cutover.md`.
