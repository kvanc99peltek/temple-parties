-- Mirror of supabase/migrations/0005_auth_profile_trigger_domain_hook.sql
-- (backend/schema/ is documentation of applied SQL; not auto-applied.)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.hook_restrict_signup_temple_edu(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  email text;
BEGIN
  email := lower(coalesce(event->'user'->>'email', ''));

  IF email = '' OR right(email, length('@temple.edu')) <> '@temple.edu' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Only @temple.edu email addresses are allowed',
        'http_code', 400
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_restrict_signup_temple_edu(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup_temple_edu(jsonb) FROM PUBLIC, anon, authenticated;
