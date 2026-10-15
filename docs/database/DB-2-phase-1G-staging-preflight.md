# STRIVA V2 — DB-2 Phase 1G: Final Staging Preflight & Deployment Authorization Gate

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9a_rls_recursion_fix.sql`  
**Migration Runner:** `backend/scripts/apply_staging_migrations.js` (Target-enabled)  
**Advisory Lock Key:** `746291048201582` (`pg_advisory_xact_lock`)  
**Status:** **READY FOR EXPLICIT STAGING AUTHORIZATION** (Preflight queries prepared; remote modifications strictly blocked pending operator execution)

---

## 1. Safety Boundary & Preflight Mandate

This document serves as the final authorization gate prior to applying Phase 9A to the STRIVA V2 staging database.
- **Zero Remote DDL/DML**: No remote modifications were executed during this phase.
- **Read-Only Protocol**: All preflight operations are non-mutating SQL metadata inspections.
- **Strict Environment Verification**: A remote Supabase host must be positively confirmed as the intended staging project by an authorized operator before any migration is attempted.

---

## 2. Phase 1F Verification Reconciliation

In Phase 1F, two different totals were cited due to an arithmetic categorization discrepancy. A complete, line-by-line audit reconciles the test counts across the repository:

### 2.1 The Discrepancy Breakdown
1. **The Arithmetic Error in Phase 1F**:
   - The Phase 1F tier summary reported `12 + 22 + 7 + 51 + 10 = 102`.
   - The individual suite summary reported `8 + 24 + 19 + 50 + 9 = 110`.
2. **Root Cause**:
   - In the tier summary, Tier 2 (unit simulation) miscounted Part 7's runner simulation tests as 6 instead of 13, and omitted Test 36 (specification contract).
   - In Tier 5, Test 37 (live PostgreSQL test) was counted in the tier as 10 (9 tests from `phase9a_real_postgres.integration.test.ts` + Test 37), but Test 37 was *already included* in the 50 tests of `phase9a_rls_recursion_fix.security.test.ts`.

### 2.2 Reconciled Unique Test Counts (Current Repository State)
With the addition of **Test 51** (verifying single-migration targeting in `apply_staging_migrations.js`), the repository contains exactly **111 unique test cases**:

| Test Suite File | Test Range / Subsections | Unique Count | Classification |
| :--- | :--- | :---: | :--- |
| `tests/security/phase9a_rls_recursion_fix.security.test.ts` | Part 1: Tests 1–12 | 12 | Static AST / DDL Inspection |
| | Part 2: Tests 13–17 | 5 | Unit Logic Simulation (Ownership) |
| | Part 3: Tests 18–26 | 9 | Pure Logic Simulation (RBAC Matrix) |
| | Part 4: Tests 27–28 | 2 | Mathematical Recursion Elimination Trace |
| | Part 5: Tests 29–35 | 7 | Mocked Integration (Supertest + Express) |
| | Part 6: Tests 36–37 | 2 | Harness Spec (1) + Live PG Test (1, deferred offline) |
| | Part 7: Tests 38–51 | 14 | Runner Unit & Advisory Lock Simulation |
| | *File Subtotal* | **51** | |
| `tests/integration/phase9a_real_postgres.integration.test.ts` | Section 1: Advisory Lock Concurrency | 2 | Real PostgreSQL Engine (Port 5433) |
| | Section 2: Phase 9A DDL & RLS Validation | 5 | Real PostgreSQL Engine (Port 5433) |
| | Section 3: Runner Concurrency & Rollback | 2 | Real PostgreSQL Engine (Port 5433) |
| | *File Subtotal* | **9** | |
| `tests/security/rls.security.test.ts` | Baseline RLS Policies | 8 | Offline Security Regression |
| `tests/security/phase8b_organization_staff.security.test.ts` | Staff & Multi-Tenancy Roles | 24 | Offline Security Regression |
| `tests/security/phase8d_member_management.security.test.ts` | Member Operations & Limits | 19 | Offline Security Regression |
| **Total Reconciled Unique Tests** | | **111** | **111 Passed (0 Failures)** |

---

## 3. Deployment Artifact Verification

The following canonical files were inspected to verify version consistency, safety mechanisms, and lock protocols:

| Artifact Path | Reviewed Version / Invariants | Status |
| :--- | :--- | :---: |
| [`backend/supabase/migrations/phase_9a_rls_recursion_fix.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_9a_rls_recursion_fix.sql) | Preflight Gate 1, `is_org_manager` helper, `search_path = pg_catalog, pg_temp`, Step 4 actual ownership & FORCE RLS gate, non-recursive policy replacement. | **CONSISTENT** |
| [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) | Lock key `'746291048201582'`, `BEGIN` -> lock -> history read inside transaction, rollback error shielding, cleanup in `finally` before `process.exit(1)`, single-migration targeting mode. | **CONSISTENT** |
| [`backend/tests/security/phase9a_rls_recursion_fix.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase9a_rls_recursion_fix.security.test.ts) | 51 tests covering DDL, gates, RBAC, recursion elimination, lock ordering, error logging, and single-target mode. | **CONSISTENT** |
| [`backend/tests/integration/phase9a_real_postgres.integration.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/integration/phase9a_real_postgres.integration.test.ts) | Real PostgreSQL 18.3 integration tests verifying advisory lock serialization, 42P17 reproduction and elimination, and real SQL mutations. | **CONSISTENT** |
| [`docs/database/DB-2-phase-1D-deployment-runbook.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1D-deployment-runbook.md) | Bifurcated runbook with pure SQL for Supabase Web Editor, advisory lock protocol, and fail-closed recovery. | **CONSISTENT** |
| [`docs/database/DB-2-phase-1E-concurrency-review.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1E-concurrency-review.md) | Lock architecture specification, repudiation of blind ownership alteration, anti-reapplication safety. | **CONSISTENT** |
| [`docs/database/DB-2-phase-1F-postgres-validation.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1F-postgres-validation.md) | PostgreSQL 18.3 validation report with test classifications and performance metrics. | **CONSISTENT** |

### 3.1 Mitigation: Preventing Unintentional Execution of Unrelated Migrations
**Risk Identified**: The default runner contains a fixed array of 12 migrations. If executed on a database where earlier migrations were not tracked, it would attempt to execute those files before Phase 9A.  
**Implemented Remediation**: [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) supports an explicit command-line target:
```bash
node backend/scripts/apply_staging_migrations.js phase_9a_rls_recursion_fix.sql
```
When a target migration is provided:
1. The runner filters the execution list strictly to `phase_9a_rls_recursion_fix.sql`.
2. All transactional guarantees, the advisory lock (`746291048201582`), history recording, and connection cleanups remain active.
3. No unrelated pending migrations can be executed.

---

## 4. Read-Only Staging Preflight Protocol

The operator must execute the following 10 read-only checks against the staging Supabase database before initiating deployment.

> **Status Notice**: Because remote execution is not permitted during Phase 1G, all checks below are designated **`NOT YET VERIFIED`** pending operator execution.

```sql
-- ====================================================================
-- STRIVA V2 — Phase 9A Read-Only Staging Preflight Script
-- (Non-mutating: Zero DDL, Zero DML, Zero Lock Acquisition)
-- ====================================================================

-- CHECK 1: Target Database Host & Project Identity
SELECT 
    current_database() AS database_name,
    current_user AS executing_role,
    inet_server_addr() AS server_ip,
    version() AS postgres_version;

-- CHECK 2: Table Existence & Schema Structure
SELECT 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members') AS om_table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id') AS org_owner_id_exists;

-- CHECK 3: RLS Enabled & FORCE RLS State
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls_enabled,
    t.tableowner AS table_owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE n.nspname = 'public' AND c.relname = 'organization_members';

-- CHECK 4: Existing is_org_manager Function State
SELECT 
    p.proname,
    r.rolname AS function_owner,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public' AND p.proname = 'is_org_manager';

-- CHECK 5: Existing Policies on public.organization_members
SELECT 
    policyname,
    cmd,
    roles,
    qual AS using_expression,
    with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'organization_members';

-- CHECK 6: Migration History Table & Phase 9A Status
SELECT 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = '_migrations') AS migrations_table_exists,
    (SELECT COUNT(*) FROM public._migrations WHERE name = 'phase_9a_rls_recursion_fix.sql') AS phase_9a_already_applied;

-- CHECK 7: Executing Role Privileges
SELECT 
    r.rolname,
    r.rolsuper AS is_superuser,
    r.rolbypassrls AS has_bypassrls,
    r.rolcreaterole AS can_create_role
FROM pg_roles r
WHERE r.rolname = CURRENT_USER;

-- CHECK 8: Active Locks or In-Flight Migrations on organization_members
SELECT 
    pid,
    usename,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE state != 'idle' 
  AND pid != pg_backend_pid()
  AND (query ILIKE '%organization_members%' OR query ILIKE '%_migrations%');
```

### Preflight Invariants & Stop Conditions
| Check # | Description | Expected Value | Stop Condition (Do Not Deploy If) | Operator Status |
| :---: | :--- | :--- | :--- | :---: |
| **Check 1** | Project Identity | Staging DB reference | Target is production or unknown | `NOT YET VERIFIED` |
| **Check 2** | Target Tables | `om_table_exists` = 1, `org_owner_id_exists` = 1 | Any table or column missing | `NOT YET VERIFIED` |
| **Check 3** | RLS & FORCE RLS | `rls_enabled` = true, `force_rls_enabled` = false | RLS disabled OR FORCE RLS enabled | `NOT YET VERIFIED` |
| **Check 4** | Existing Function | Null (does not exist) OR owned by `postgres`/bypass role | Owned by an unprivileged role | `NOT YET VERIFIED` |
| **Check 5** | Current Policies | `"Staff managers manage organization members"` present | Table missing or policy locked | `NOT YET VERIFIED` |
| **Check 6** | History Status | `migrations_table_exists` = 1, `already_applied` = 0 | Phase 9A already recorded | `NOT YET VERIFIED` |
| **Check 7** | Role Privileges | `CURRENT_USER` has `rolbypassrls` = true OR is table owner | Role cannot bypass RLS | `NOT YET VERIFIED` |
| **Check 8** | Conflicting Locks | 0 active transactions | In-flight DDL or active locks present | `NOT YET VERIFIED` |
| **Check 9** | Point-in-Time Backup | Fresh staging backup or branch exists | No recoverable backup | `NOT YET VERIFIED` |
| **Check 10** | Tenant Isolation | Pre-migration isolation intact | Cross-tenant data leakage observed | `NOT YET VERIFIED` |

---

## 5. Staging Deployment Execution Procedure

Once all 10 preflight checks evaluate to **PASS**, execute deployment using **Method A** or **Method B**.

### Method A: Single-Target Runner (Recommended)
```bash
node backend/scripts/apply_staging_migrations.js phase_9a_rls_recursion_fix.sql
```
*Guarantees atomic execution, transaction-scoped advisory locking (`746291048201582`), history tracking, and zero execution of unrelated pending migrations.*

### Method B: Supabase SQL Web Editor (Pure SQL)
Paste and run the atomic transaction block from [`docs/database/DB-2-phase-1D-deployment-runbook.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1D-deployment-runbook.md) (Method C):
```sql
BEGIN;

-- 1. Acquire transaction advisory lock
SELECT pg_advisory_xact_lock(746291048201582);

-- 2. Execute Preflight Safety Gate
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members') THEN
        RAISE EXCEPTION 'Preflight verification failed: organization_members missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id') THEN
        RAISE EXCEPTION 'Preflight verification failed: organizations.owner_id missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'organization_members' AND c.relrowsecurity = true) THEN
        RAISE EXCEPTION 'Preflight verification failed: RLS not enabled on organization_members.';
    END IF;
END $$;

-- 3. Create Dedicated SECURITY DEFINER Helper Function
CREATE OR REPLACE FUNCTION public.is_org_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL OR target_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = target_org_id AND o.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = target_org_id
          AND om.user_id = auth.uid()
          AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

-- 4. Hardened Privileges
REVOKE ALL ON FUNCTION public.is_org_manager(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_manager(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_manager(UUID) TO service_role;

-- 5. Safety Gate Step 4: Verify Actual Ownership & FORCE RLS
DO $$
DECLARE
    v_func_owner_name TEXT;
    v_func_owner_bypassrls BOOLEAN;
    v_func_owner_super BOOLEAN;
    v_table_owner TEXT;
    v_relforcerowsecurity BOOLEAN;
BEGIN
    SELECT r.rolname, COALESCE(r.rolbypassrls, false), COALESCE(r.rolsuper, false)
    INTO v_func_owner_name, v_func_owner_bypassrls, v_func_owner_super
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = 'public' AND p.proname = 'is_org_manager' LIMIT 1;

    SELECT t.tableowner, COALESCE(c.relforcerowsecurity, false)
    INTO v_table_owner, v_relforcerowsecurity
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public' AND t.tablename = 'organization_members';

    IF NOT ((v_func_owner_bypassrls OR v_func_owner_super) OR (v_func_owner_name = v_table_owner AND NOT v_relforcerowsecurity)) THEN
        RAISE EXCEPTION 'Safety Gate Abort: Function owner cannot bypass RLS on organization_members.';
    END IF;
END $$;

-- 6. Replace Policy
DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;

CREATE POLICY "Staff managers manage organization members" ON public.organization_members
    FOR ALL TO authenticated, service_role
    USING ( public.is_org_manager(organization_id) )
    WITH CHECK ( public.is_org_manager(organization_id) );

-- 7. Record History
INSERT INTO public._migrations (name, run_at)
VALUES ('phase_9a_rls_recursion_fix.sql', NOW());

COMMIT;
```

---

## 6. Post-Deployment Verification & Fail-Closed Recovery

### 6.1 Post-Deployment Verification SQL
```sql
-- 1. Confirm history record
SELECT name, run_at FROM public._migrations WHERE name = 'phase_9a_rls_recursion_fix.sql';

-- 2. Verify helper function definition and security definer status
SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname = 'is_org_manager';

-- 3. Verify routine privileges (Only authenticated & service_role)
SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name = 'is_org_manager';

-- 4. Verify policy on public.organization_members
SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'organization_members';

-- 5. Test EXPLAIN query plan (Verifies ZERO 42P17 recursion)
EXPLAIN SELECT * FROM public.organization_members WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
```

### 6.2 Fail-Closed Recovery
> [!CAUTION]
> Never restore the legacy Phase 8B policy. Restoring the self-referential subquery reintroduces `ERROR 42P17`.

If withdrawal is required, execute in an explicit transaction:
```sql
BEGIN;
DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;
DROP FUNCTION IF EXISTS public.is_org_manager(UUID);
COMMIT;
```
*RLS remains active; read access continues via `is_org_member()`; mutations fail closed safely; service_role continues unaffected. Leave `_migrations` intact to prevent automated runners from reapplying the migration.*

---

## 7. Final Recommendation

**Determination:** **`READY FOR EXPLICIT STAGING AUTHORIZATION`**  
- **Test Integrity**: All 111 unique tests pass cleanly offline and against real PostgreSQL 18.
- **Artifact Consistency**: The migration, targeted runner, integration tests, and runbooks are strictly aligned.
- **Safety Gate**: Deployment is blocked until an authorized operator executes the read-only preflight script against the verified staging environment and records all checks as `PASS`.
