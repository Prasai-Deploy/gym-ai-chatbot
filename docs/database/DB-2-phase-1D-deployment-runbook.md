# STRIVA V2 — DB-2 Phase 1D: Deployment & Recovery Runbook

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Scope:** Deployment of Phase 9A RLS Recursion Fix (`phase_9a_rls_recursion_fix.sql`)  
**Target Architecture:** STRIVA V2  
**Target Environment:** Staging & Production Supabase PostgreSQL  

---

## 1. Operational Principles & Safety Rules

1. **Transaction Atomicity**: All DDL statements, safety gates, and migration history tracking entries must be executed within a single transactional block (`BEGIN ... COMMIT`).
2. **Never Bypass Safety Gates**: If any preflight or post-creation gate raises an exception, the migration must roll back immediately. Do not disable or comment out safety gates.
3. **Prohibition of Recursive Policy Restoration**: Under no circumstances should the legacy Phase 8B policy containing the self-referential subquery on `organization_members` be restored. Doing so immediately re-triggers PostgreSQL `ERROR 42P17`.
4. **Environment-Specific Execution Syntax**:
   - `psql` meta-commands (such as `\i`) are valid **only** in the interactive `psql` CLI.
   - The Supabase SQL Editor executes raw SQL queries over the wire protocol; `\i` is invalid syntax and will fail. Always use pure SQL in the web console.
5. **Migration History Preservation**: Never delete migration history records as a generic rollback step. Deleting a record from `public._migrations` will cause automated runners (e.g. CI/CD) to automatically reapply the withdrawn migration on their next execution.

---

## 2. Preflight Verification (Step 1)

Execute the following read-only SQL query in the target database environment **before** applying any migration statements. All invariants must pass before proceeding.

```sql
-- ====================================================================
-- STRIVA V2 Phase 9A Preflight Verification Query (Read-Only)
-- ====================================================================
SELECT 
    -- 1. Verify organization_members table exists
    (SELECT COUNT(*) 
     FROM pg_tables 
     WHERE schemaname = 'public' AND tablename = 'organization_members') AS om_table_exists,
    
    -- 2. Verify organizations table exists with owner_id column
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id') AS org_owner_id_exists,
    
    -- 3. Verify RLS is enabled on organization_members
    (SELECT c.relrowsecurity 
     FROM pg_class c 
     JOIN pg_namespace n ON n.oid = c.relnamespace 
     WHERE n.nspname = 'public' AND c.relname = 'organization_members') AS om_rls_enabled,
    
    -- 4. Check FORCE RLS status on organization_members
    (SELECT c.relforcerowsecurity 
     FROM pg_class c 
     JOIN pg_namespace n ON n.oid = c.relnamespace 
     WHERE n.nspname = 'public' AND c.relname = 'organization_members') AS om_force_rls_enabled,
    
    -- 5. Inspect table owner of organization_members
    (SELECT tableowner 
     FROM pg_tables 
     WHERE schemaname = 'public' AND tablename = 'organization_members') AS om_table_owner,
    
    -- 6. Check if is_org_manager already exists and inspect its current owner
    (SELECT r.rolname 
     FROM pg_proc p 
     JOIN pg_namespace n ON n.oid = p.pronamespace 
     JOIN pg_roles r ON r.oid = p.proowner 
     WHERE n.nspname = 'public' AND p.proname = 'is_org_manager' 
     LIMIT 1) AS existing_func_owner,
     
    -- 7. Inspect current executing role and bypass privileges
    (SELECT rolname FROM pg_roles WHERE rolname = CURRENT_USER) AS executing_role,
    (SELECT rolsuper FROM pg_roles WHERE rolname = CURRENT_USER) AS executing_role_is_superuser,
    (SELECT rolbypassrls FROM pg_roles WHERE rolname = CURRENT_USER) AS executing_role_has_bypassrls;
```

### Required Preflight Invariants
| Check | Field | Required Value | Remediation if Failed |
| :--- | :--- | :--- | :--- |
| **Check 1** | `om_table_exists` | `1` | Abort. `organization_members` table is missing. |
| **Check 2** | `org_owner_id_exists` | `1` | Abort. `organizations.owner_id` column is missing. |
| **Check 3** | `om_rls_enabled` | `true` | Abort. RLS must be enabled on `organization_members`. |
| **Check 4 & 5** | `om_force_rls_enabled` | `false` (or role has bypass) | If `true`, executing/function owner must hold `rolbypassrls = true`. |
| **Check 6** | `existing_func_owner` | `null` or privileged role | **HALT DEPLOYMENT.** Do NOT execute `ALTER ... OWNER TO postgres`. Inspect function via `SELECT pg_get_functiondef(oid)` and determine origin. If stale or unapproved, drop via `DROP FUNCTION public.is_org_manager(UUID);` in a verified maintenance window before applying. |
| **Check 7** | `executing_role` | Privileged role | Executing role must match table owner or possess `rolbypassrls`/`rolsuper`. |

---

## 3. Migration Execution (Step 2)

Choose the execution method appropriate for your deployment pipeline.

### Method A: Automated Runner (Node.js)
Execute the hardened staging migration runner from the repository root:
```bash
node backend/scripts/apply_staging_migrations.js
```
*The runner wraps execution in an atomic `BEGIN ... COMMIT` block, acquires the transaction-scoped advisory lock (`746291048201582`), executes the Phase 9A file, updates `public._migrations`, logs the result, and releases all connections gracefully.*

---

### Method B: Command-Line `psql` (Script Input)
When using the PostgreSQL interactive terminal, execute:
```sql
BEGIN;

-- Concurrency safeguard: acquire transaction-level advisory lock
SELECT pg_advisory_xact_lock(746291048201582);

\i backend/supabase/migrations/phase_9a_rls_recursion_fix.sql

-- Record migration history atomically inside the same transaction
INSERT INTO public._migrations (name, run_at)
VALUES ('phase_9a_rls_recursion_fix.sql', NOW());

COMMIT;
```

---

### Method C: Supabase SQL Web Editor (Pure SQL)
In the Supabase Dashboard SQL Editor, paste and run the complete atomic script below.  
*(Notice: Do **NOT** use `\i` commands in the web console)*:

```sql
BEGIN;

-- Concurrency safeguard: acquire transaction-level advisory lock
SELECT pg_advisory_xact_lock(746291048201582);

-- 1. Preflight Safety Gate
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'organization_members'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.organization_members table does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.organizations.owner_id column does not exist.';
    END IF;

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
    IF auth.uid() IS NULL OR target_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

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

-- 3. Privilege Hardening
REVOKE ALL ON FUNCTION public.is_org_manager(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_manager(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO service_role;

-- 4. Post-Creation Safety Gate: Verify Actual Ownership & FORCE RLS Status
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
    SELECT r.rolname, COALESCE(r.rolbypassrls, false), COALESCE(r.rolsuper, false)
    INTO v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = 'public' 
      AND p.proname = 'is_org_manager'
      AND pg_get_function_identity_arguments(p.oid) = 'target_org_id uuid';

    IF v_func_owner_name IS NULL THEN
        SELECT r.rolname, COALESCE(r.rolbypassrls, false), COALESCE(r.rolsuper, false)
        INTO v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles r ON r.oid = p.proowner
        WHERE n.nspname = 'public' 
          AND p.proname = 'is_org_manager'
        LIMIT 1;
    END IF;

    SELECT t.tableowner, COALESCE(c.relforcerowsecurity, false)
    INTO v_table_owner, v_relforcerowsecurity
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public' AND t.tablename = 'organization_members';

    v_is_owner_match := (v_func_owner_name = v_table_owner);
    v_can_bypass_rls := (v_func_owner_bypassrls OR v_func_owner_super) OR (v_is_owner_match AND NOT v_relforcerowsecurity);

    IF NOT v_can_bypass_rls THEN
        RAISE EXCEPTION 'Safety Gate Abort: Function public.is_org_manager is owned by role "%" (BYPASSRLS: %, SUPERUSER: %). Table public.organization_members is owned by "%" (relforcerowsecurity: %). The function owner cannot bypass RLS on organization_members. Aborting migration before modifying live policies.',
            v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super, v_table_owner, v_relforcerowsecurity;
    END IF;
END $$;

-- 5. Replace Recursive Policy on public.organization_members
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

-- 6. Atomically Record Migration in History Tracking Table
INSERT INTO public._migrations (name, run_at)
VALUES ('phase_9a_rls_recursion_fix.sql', NOW());

COMMIT;
```

---

## 4. Post-Deployment Verification (Step 3)

Execute this read-only verification query immediately following deployment:

```sql
-- ====================================================================
-- STRIVA V2 Phase 9A Post-Deployment Verification
-- ====================================================================

-- 1. Confirm migration record in history table
SELECT name, run_at 
FROM public._migrations 
WHERE name = 'phase_9a_rls_recursion_fix.sql';

-- 2. Verify function metadata, security definer flag, and search path
SELECT 
    p.proname,
    r.rolname AS function_owner,
    p.prosecdef AS is_security_definer,
    p.provolatile AS volatility_mode,
    p.proconfig AS search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public' AND p.proname = 'is_org_manager';

-- 3. Confirm routine privileges (EXECUTE granted only to authenticated & service_role)
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' AND routine_name = 'is_org_manager';

-- 4. Verify policy on public.organization_members
SELECT 
    policyname, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organization_members' 
  AND policyname = 'Staff managers manage organization members';

-- 5. Verify query execution plan (Assert ZERO 42P17 recursion error)
EXPLAIN SELECT * FROM public.organization_members 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
```

### Verification Criteria
1. **History Table**: Exactly one record returned with name `phase_9a_rls_recursion_fix.sql`.
2. **Function**: `is_security_definer` = `true`, `volatility_mode` = `'s'` (stable), `search_path_setting` = `{"search_path=pg_catalog, pg_temp"}`.
3. **Privileges**: Only `authenticated` and `service_role` have `EXECUTE`. No rows exist for `anon` or `PUBLIC`.
4. **Policy**: `qual` and `with_check` call `public.is_org_manager(organization_id)`.
5. **EXPLAIN Plan**: Successfully outputs a plan (Index Scan / Seq Scan) without throwing `ERROR 42P17`.

---

## 5. Fail-Closed Recovery & Withdrawal Procedures (Step 4)

### 5.1 When to Withdraw
Execute this withdrawal procedure if:
- Post-deployment verification fails.
- Operational anomalies occur with member authorization.

### 5.2 Prohibition of Legacy Recursive Policy Restoration
> [!CAUTION]
> **DO NOT RESTORE THE LEGACY PHASE 8B POLICY.**  
> The legacy policy `"Staff managers manage organization members"` contained a naked recursive subquery against `organization_members`. Restoring it immediately reintroduces PostgreSQL error `42P17`.

### 5.3 Fail-Closed Withdrawal Procedure
Withdrawing the policy leaves the database in a secure, fail-closed state where existing members can still read their memberships, backend `service_role` tasks continue unaffected, and client write mutations are safely rejected.

Execute inside a transaction:
```sql
BEGIN;

-- 1. Drop the manager policy to transition into a fail-closed write state
DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;

-- 2. Optional: Remove the helper function if withdrawing completely
DROP FUNCTION IF EXISTS public.is_org_manager(UUID);

-- 3. Note regarding public._migrations:
-- DO NOT delete the record from public._migrations unless you have also removed 
-- the file from the runner array in backend/scripts/apply_staging_migrations.js!
-- Deleting the row will cause CI/CD or the next runner execution to automatically 
-- re-apply phase_9a_rls_recursion_fix.sql.

COMMIT;
```

### 5.4 Preventing Accidental Automatic Reapplication
If Phase 9A is deliberately withdrawn, update [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) to comment out or remove `'phase_9a_rls_recursion_fix.sql'` from the `migrations` array before committing changes to Git. This ensures automated environments do not attempt to reapply the migration.
