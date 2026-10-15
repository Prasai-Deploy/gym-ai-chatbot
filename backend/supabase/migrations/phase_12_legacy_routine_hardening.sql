-- ====================================================================
-- STRIVA V2 - Phase 12: Legacy Routine Security Hardening
--
-- Target Database: Supabase project ymrblyiwohvxptiqjfsi (Staging Baseline: 26 migrations)
-- Advisory Lock Key: 746291048201582
--
-- Approved Scope:
-- 1. Timestamp Trigger: public.update_modified_column()
--    - Keep SECURITY INVOKER; pin search_path = pg_catalog, pg_temp.
--    - Schema-qualify pg_catalog.now().
--    - Revoke PUBLIC and anon execution while preserving required authenticated execution.
-- 2. Timestamp Trigger: public.update_updated_at_column()
--    - Keep SECURITY INVOKER; pin search_path = pg_catalog, pg_temp.
--    - Schema-qualify pg_catalog.now().
--    - Revoke PUBLIC and anon execution while preserving required authenticated execution.
-- 3. Scheduled Maintenance: public.update_membership_statuses()
--    - Keep SECURITY INVOKER; pin search_path = pg_catalog, pg_temp.
--    - Schema-qualify all 4 application tables (public.memberships, etc.).
--    - Revoke PUBLIC, anon, and authenticated execution to seal PostgREST RPC attack surface.
--    - Restrict EXECUTE strictly to postgres (for pg_cron) and service_role.
-- 4. Admin Helper: public.is_admin()
--    - Convert to SECURITY INVOKER with STABLE volatility.
--    - Pin search_path = pg_catalog, pg_temp; schema-qualify public.admins.
--    - Revoke PUBLIC and anon execution; grant to authenticated, service_role, postgres.
-- 5. Admin Helper: public.get_admin_role()
--    - Convert to SECURITY INVOKER with STABLE volatility.
--    - Pin search_path = pg_catalog, pg_temp; schema-qualify public.admins.
--    - Revoke PUBLIC and anon execution; grant to authenticated, service_role, postgres.
--
-- Explicit Exclusions:
-- - Zero modifications to previously deployed Phase 11 / DB-5 migrations.
-- - No drop or recreation of triggers, tables, or columns.
-- - No alterations to active RLS policies.
--
-- TRANSACTION SAFETY & EXECUTION NOTE:
-- Migration runners wrap individual migrations in BEGIN ... COMMIT with
-- advisory lock 746291048201582.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Routine Hardening: public.update_modified_column()
-- --------------------------------------------------------------------
-- Row-level trigger function attached to 11 active core V2 tables.
-- Must remain SECURITY INVOKER. Authenticated execution is strictly preserved.
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_modified_column() IS
'STRIVA V2 core update trigger hardened with search_path = pg_catalog, pg_temp and SECURITY INVOKER mode.';

REVOKE ALL ON FUNCTION public.update_modified_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_modified_column() FROM anon;
GRANT EXECUTE ON FUNCTION public.update_modified_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_modified_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_modified_column() TO postgres;


-- --------------------------------------------------------------------
-- 2. Routine Hardening: public.update_updated_at_column()
-- --------------------------------------------------------------------
-- Row-level trigger function attached to legacy update triggers.
-- Must remain SECURITY INVOKER. Authenticated execution is strictly preserved.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS
'STRIVA legacy update trigger hardened with search_path = pg_catalog, pg_temp and SECURITY INVOKER mode.';

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO postgres;


-- --------------------------------------------------------------------
-- 3. Routine Hardening: public.update_membership_statuses()
-- --------------------------------------------------------------------
-- Maintenance routine executed daily at 00:00 UTC via pg_cron as role postgres.
-- Must remain SECURITY INVOKER. All 4 table references schema-qualified.
-- Direct PostgREST RPC access revoked from PUBLIC, anon, and authenticated.
CREATE OR REPLACE FUNCTION public.update_membership_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  -- Mark expired
  UPDATE public.memberships
  SET status = 'expired'
  WHERE expiry_date < CURRENT_DATE
    AND status != 'expired';

  -- Mark due soon (expiring within 7 days)
  UPDATE public.memberships
  SET status = 'due_soon'
  WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    AND status = 'active';

  -- When expired: deactivate workout and diet assignments for non-PT members
  UPDATE public.user_workout_assignments
  SET active = false
  WHERE user_id IN (
    SELECT m.user_id FROM public.memberships m
    JOIN public.membership_plans mp ON m.plan_id = mp.id
    WHERE m.status = 'expired'
      AND mp.name NOT ILIKE '%personal%'
  );

  UPDATE public.user_diet_assignments
  SET active = false
  WHERE user_id IN (
    SELECT m.user_id FROM public.memberships m
    JOIN public.membership_plans mp ON m.plan_id = mp.id
    WHERE m.status = 'expired'
      AND mp.name NOT ILIKE '%personal%'
  );
END;
$$;

COMMENT ON FUNCTION public.update_membership_statuses() IS
'STRIVA membership lifecycle maintenance routine hardened with search_path = pg_catalog, pg_temp, schema qualification, and restricted to postgres and service_role.';

REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM anon;
REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_statuses() TO postgres;
GRANT EXECUTE ON FUNCTION public.update_membership_statuses() TO service_role;


-- --------------------------------------------------------------------
-- 4. Routine Hardening: public.is_admin()
-- --------------------------------------------------------------------
-- Helper checking if calling user has an entry in public.admins.
-- Table public.admins has RLS policy permitting self-selection; converted
-- to SECURITY INVOKER to eliminate superuser privilege escalation risk.
-- Search path pinned to pg_catalog, pg_temp and public.admins schema-qualified.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
'STRIVA admin check helper hardened to SECURITY INVOKER with search_path = pg_catalog, pg_temp and anonymous execution revoked.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO postgres;


-- --------------------------------------------------------------------
-- 5. Routine Hardening: public.get_admin_role()
-- --------------------------------------------------------------------
-- Helper returning the role of the calling user from public.admins.
-- Converted to SECURITY INVOKER with pinned search path and schema qualification.
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS character varying
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT role FROM public.admins 
  WHERE email = auth.jwt() ->> 'email'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_admin_role() IS
'STRIVA admin role helper hardened to SECURITY INVOKER with search_path = pg_catalog, pg_temp and anonymous execution revoked.';

REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO postgres;
