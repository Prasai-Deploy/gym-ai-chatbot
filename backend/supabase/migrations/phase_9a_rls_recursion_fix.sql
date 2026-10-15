-- ====================================================================
-- STRIVA V2 - Phase 9A: Resolve Organization Membership RLS Recursion
-- DB-2 Phase 1B: Final Migration Safety Gate
--
-- Eliminates PostgreSQL error 42P17 (infinite recursion detected in policy
-- for relation "organization_members") by replacing the recursive manager
-- policy with a dedicated SECURITY DEFINER helper function:
-- public.is_org_manager(UUID).
--
-- Architecture & Invariants:
-- 1. Helper function is SECURITY DEFINER with restricted search_path = pg_catalog, pg_temp.
-- 2. Fully qualifies auth.uid() and application schema table references (public.*).
-- 3. Fails closed when auth.uid() is null or target_org_id is null.
-- 4. Preserves management semantics:
--    - Direct organization owner (organizations.owner_id = auth.uid())
--    - Permitted managerial roles: 'Organization Owner', 'Gym Manager', 'Platform Super Admin'
-- 5. Revokes execution from PUBLIC and anon; grants strictly to authenticated & service_role.
-- 6. Additive and forward-only; zero data deletion; zero modification to profiles.organization_id.
-- 7. Deployment Prerequisite & Post-Creation Verification Gate:
--    - Inspects actual function owner in pg_proc after creation/replacement.
--    - Accounts for CREATE OR REPLACE FUNCTION preserving pre-existing ownership.
--    - Verifies function owner has BYPASSRLS / SUPERUSER, OR matches tableowner
--      with relforcerowsecurity = false on public.organization_members.
--    - Aborts safely BEFORE the live manager policy is dropped if invariant is not met.
--
-- TRANSACTION SAFETY & EXECUTION NOTE:
-- Migration runners (e.g. backend/scripts/apply_staging_migrations.js) wrap
-- individual migrations in BEGIN ... COMMIT. When executing this script manually
-- via psql or Supabase SQL editor, execute within an explicit transaction block:
--   BEGIN;
--   \i phase_9a_rls_recursion_fix.sql
--   COMMIT;
-- All preflight and ownership verification checks abort before any policy is dropped.
--
-- SAFE ROLLBACK & RECOVERY PROCEDURE:
-- CAUTION: Do NOT restore the legacy recursive policy from Phase 8B.
-- Restoring the self-referential subquery reintroduces PostgreSQL error 42P17.
-- If this management policy must be withdrawn, withdraw it to a fail-closed state:
--   DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;
-- Result: RLS remains active; read operations continue via is_org_member();
-- all client mutations fail closed safely; service_role backend operations continue unaffected.
-- Optionally drop the helper: DROP FUNCTION IF EXISTS public.is_org_manager(UUID);
-- ====================================================================

-- 1. Preflight Safety Gate: Verify target schema prerequisites before applying changes
DO $$
BEGIN
    -- Verify public.organization_members table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'organization_members'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.organization_members table does not exist.';
    END IF;

    -- Verify public.organizations table exists with owner_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.organizations.owner_id column does not exist.';
    END IF;

    -- Verify RLS is enabled on public.organization_members
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
          AND c.relname = 'organization_members' 
          AND c.relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: Row Level Security is not enabled on public.organization_members.';
    END IF;
END $$;

-- 2. Dedicated Non-Recursive Manager Authorization Helper Function
CREATE OR REPLACE FUNCTION public.is_org_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Fail-closed on missing authentication or null target organization
    IF auth.uid() IS NULL OR target_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Evaluate direct organization ownership or authorized management roles
    RETURN EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = target_org_id
          AND o.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = target_org_id
          AND om.user_id = auth.uid()
          AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

COMMENT ON FUNCTION public.is_org_manager(UUID) IS 
'STRIVA V2 SECURITY DEFINER helper that authorizes organization owners, gym managers, and platform super admins without triggering RLS recursion on public.organization_members. Search path is restricted to pg_catalog, pg_temp.';

-- 3. Privilege Hardening: Restrict execution to authorized roles
REVOKE ALL ON FUNCTION public.is_org_manager(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_manager(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO service_role;

-- 4. Post-Creation Safety Gate: Verify Actual Helper Function Ownership & FORCE RLS Status
-- In PostgreSQL, CREATE OR REPLACE FUNCTION preserves pre-existing ownership.
-- We must verify that the ACTUAL function owner can bypass RLS for public.organization_members
-- BEFORE we drop or replace the live policy.
DO $$
DECLARE
    v_func_owner_name TEXT;
    v_func_owner_bypassrls BOOLEAN;
    v_func_owner_super BOOLEAN;
    v_table_owner TEXT;
    v_relforcerowsecurity BOOLEAN;
    v_is_owner_match BOOLEAN;
    v_can_bypass_rls BOOLEAN;
BEGIN
    -- Inspect actual function owner from pg_proc
    SELECT r.rolname, COALESCE(r.rolbypassrls, false), COALESCE(r.rolsuper, false)
    INTO v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = 'public' 
      AND p.proname = 'is_org_manager'
      AND pg_get_function_identity_arguments(p.oid) = 'target_org_id uuid';

    IF v_func_owner_name IS NULL THEN
        -- Fallback if signature argument name differs in pg_proc catalog
        SELECT r.rolname, COALESCE(r.rolbypassrls, false), COALESCE(r.rolsuper, false)
        INTO v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles r ON r.oid = p.proowner
        WHERE n.nspname = 'public' 
          AND p.proname = 'is_org_manager'
        LIMIT 1;
    END IF;

    -- Inspect table owner and FORCE RLS status on public.organization_members
    SELECT t.tableowner, COALESCE(c.relforcerowsecurity, false)
    INTO v_table_owner, v_relforcerowsecurity
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public' AND t.tablename = 'organization_members';

    -- Evaluate RLS bypass conditions:
    -- Condition A: Function owner has BYPASSRLS or SUPERUSER privileges
    -- Condition B: Function owner equals tableowner AND relforcerowsecurity is false (table owners bypass non-forced RLS)
    v_is_owner_match := (v_func_owner_name = v_table_owner);
    v_can_bypass_rls := (v_func_owner_bypassrls OR v_func_owner_super) OR (v_is_owner_match AND NOT v_relforcerowsecurity);

    IF NOT v_can_bypass_rls THEN
        RAISE EXCEPTION 'Safety Gate Abort: Function public.is_org_manager is owned by role "%" (BYPASSRLS: %, SUPERUSER: %). Table public.organization_members is owned by "%" (relforcerowsecurity: %). The function owner cannot bypass RLS on organization_members. Aborting migration before modifying live policies.',
            v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super, v_table_owner, v_relforcerowsecurity;
    END IF;
END $$;

-- 5. Replace Recursive Policy on public.organization_members
-- (Only executed if all prior preflight and ownership verification gates pass)
DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;

CREATE POLICY "Staff managers manage organization members" ON public.organization_members
    FOR ALL
    TO authenticated, service_role
    USING (
        public.is_org_manager(organization_id)
    )
    WITH CHECK (
        public.is_org_manager(organization_id)
    );

COMMENT ON POLICY "Staff managers manage organization members" ON public.organization_members IS 
'Authorizes organization owners and permitted management roles (Gym Manager, Platform Super Admin) to perform management operations within their tenant organization without RLS recursion.';
