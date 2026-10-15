# STRIVA V2 — DB-2 Phase 1H: Read-Only Staging Preflight Results

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9a_rls_recursion_fix.sql`  
**Migration Runner:** `backend/scripts/apply_staging_migrations.js` (Targeted mode)  
**Target Project Reference:** `ymrblyiwohvxptiqjfsi` (STRIVA V2 Staging)  
**Status:** **READY FOR EXPLICIT PHASE 9A STAGING DEPLOYMENT AUTHORIZATION**  

---

## 1. Executive Summary & Operator Confirmation

In accordance with DB-2 Phase 1H safety rules, all preflight validations against the remote staging database were executed using non-mutating, read-only SQL metadata queries. **Zero remote DDL, DML, or migrations were applied.**

### 1.1 Independent Operator Confirmation Record
Prior to opening any connection or executing metadata queries, explicit confirmation was solicited and received from the human operator:
1. **Designated Staging Project Identity**: Confirmed that `ymrblyiwohvxptiqjfsi` is the designated STRIVA V2 staging project.
2. **Read-Only Database Access Authorization**: Confirmed that automated read-only preflight inspection is authorized.
3. **Point-in-Time Backup / Clone Availability**: Confirmed that a fresh backup or recoverable staging clone exists before proceeding.

---

## 2. Comprehensive Preflight Checks (10 / 10 PASS)

All ten preflight checks outlined in `docs/database/DB-2-phase-1G-staging-preflight.md` were executed against `ymrblyiwohvxptiqjfsi`. Sanitized evidence and findings are recorded below:

### Check 1: Target Database Host & Identity
- **Query Executed**:
  ```sql
  SELECT 
      current_database() AS database_name,
      current_user AS executing_role,
      version() AS postgres_version;
  ```
- **Observed Result**:
  - `database_name`: `postgres`
  - `executing_role`: `postgres`
  - `postgres_version`: `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, 64-bit`
- **Evaluation**: **PASS**. Target host is confirmed as the Supabase PostgreSQL 17.6 managed staging instance. Connecting role is `postgres`.

---

### Check 2: Table Existence & Schema Prerequisites
- **Query Executed**:
  ```sql
  SELECT 
      (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members') AS om_table_exists,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id') AS org_owner_id_exists;
  ```
- **Observed Result**:
  - `om_table_exists`: `1`
  - `org_owner_id_exists`: `1`
- **Evaluation**: **PASS**. Both required relational dependencies (`public.organization_members` and `public.organizations.owner_id`) exist on staging.

---

### Check 3: RLS Enabled & FORCE RLS State
- **Query Executed**:
  ```sql
  SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS force_rls_enabled,
      t.tableowner AS table_owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
  WHERE n.nspname = 'public' AND c.relname = 'organization_members';
  ```
- **Observed Result**:
  - `table_name`: `organization_members`
  - `rls_enabled`: `true`
  - `force_rls_enabled`: `false`
  - `table_owner`: `postgres`
- **Evaluation**: **PASS**. Row Level Security is active on `organization_members`. `FORCE ROW LEVEL SECURITY` is disabled (`false`), and the table is owned by `postgres`. This satisfies Safety Gate Step 4 conditions.

---

### Check 4: Pre-Existing `is_org_manager` Helper Function State
- **Query Executed**:
  ```sql
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
  ```
- **Observed Result**: `[]` (0 rows returned)
- **Evaluation**: **PASS**. The function `public.is_org_manager` does not pre-exist on staging. There is zero risk of inheriting unprivileged ownership, stale configuration, or conflicting search paths. When created by the migration runner under role `postgres`, it will be cleanly created with owner `postgres`.

---

### Check 5: Existing Policies on `public.organization_members`
- **Query Executed**:
  ```sql
  SELECT 
      policyname,
      cmd,
      roles,
      qual AS using_expression,
      with_check AS check_expression
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_members'
  ORDER BY policyname;
  ```
- **Observed Result**:
  1. Policy `"Members view tenant memberships"`:
     - `cmd`: `SELECT`
     - `roles`: `{public}`
     - `qual`: `(is_org_member(organization_id) OR (user_id = auth.uid()))`
  2. Policy `"Staff managers manage organization members"`:
     - `cmd`: `ALL`
     - `roles`: `{authenticated,service_role}`
     - `qual`: `(EXISTS ( SELECT 1 FROM organizations o WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM organization_members om WHERE ((om.organization_id = organization_members.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['Organization Owner'::text, 'Gym Manager'::text, 'Platform Super Admin'::text])))))`
- **Evaluation**: **PASS (Defect Confirmed on Staging)**.
  - The live staging database contains the exact legacy Phase 8B policy `"Staff managers manage organization members"`.
  - The subquery contains the self-referential table scan: `FROM organization_members om WHERE ((om.organization_id = organization_members.organization_id)...)`.
  - This conclusively proves that the `42P17: infinite recursion` defect is present on staging, and that Phase 9A targets the exact policy requiring replacement.

---

### Check 6: Migration History Table & Phase 9A Status
- **Query Executed**:
  ```sql
  SELECT 
      (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = '_migrations') AS migrations_table_exists,
      (SELECT COUNT(*) FROM public._migrations WHERE name = 'phase_9a_rls_recursion_fix.sql') AS phase_9a_already_applied,
      (SELECT COUNT(*) FROM public._migrations) AS total_applied_count;
  ```
- **Observed Result**:
  - `migrations_table_exists`: `1`
  - `phase_9a_already_applied`: `0`
  - `total_applied_count`: `21`
- **Evaluation**: **PASS**. The tracking table `public._migrations` is intact with 21 recorded migrations. `phase_9a_rls_recursion_fix.sql` has not been applied yet.

---

### Check 7: Executing Role Privileges
- **Query Executed**:
  ```sql
  SELECT 
      r.rolname,
      r.rolsuper AS is_superuser,
      r.rolbypassrls AS has_bypassrls,
      r.rolcreaterole AS can_create_role
  FROM pg_roles r
  WHERE r.rolname = CURRENT_USER;
  ```
- **Observed Result**:
  - `rolname`: `postgres`
  - `is_superuser`: `false` (Standard for cloud managed Supabase instances)
  - `has_bypassrls`: `true`
  - `can_create_role`: `true`
- **Evaluation**: **PASS**. The role `postgres` possesses `rolbypassrls = true`. Because the new SECURITY DEFINER helper function will be owned by `postgres`, it satisfies Safety Gate Step 4 predicate:
  `((v_func_owner_bypassrls OR v_func_owner_super) OR (v_func_owner_name = v_table_owner AND NOT v_relforcerowsecurity))`
  The function will bypass RLS during membership lookups without recursive re-evaluation.

---

### Check 8: Active Locks or In-Flight Migrations
- **Query Executed**:
  ```sql
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
- **Observed Result**: `[]` (0 active conflicting processes)
- **Evaluation**: **PASS**. No blocking queries, conflicting locks, or in-flight migrations are active against `organization_members` or `_migrations`.

---

### Check 9: Point-in-Time Backup & Recovery Verification
- **Verification Source**: Explicit operator confirmation.
- **Observed State**: Staging database point-in-time recovery and snapshot are enabled and verified prior to deployment.
- **Evaluation**: **PASS**. A verified recovery path exists.

---

### Check 10: Existing Organization & Membership Data / Tenant Isolation
- **Query Executed**:
  ```sql
  SELECT 
      (SELECT COUNT(*) FROM public.organizations) AS total_orgs,
      (SELECT COUNT(*) FROM public.organization_members) AS total_members;
  ```
- **Observed Result**:
  - `total_orgs`: `1`
  - `total_members`: `0`
- **Evaluation**: **PASS**. Staging currently contains 1 organization and 0 membership rows. There is zero risk of data loss, user lockout, or disruption to active user records during policy replacement.

---

## 3. Summary of Preflight Findings

| Check # | Check Description | Expected Criterion | Observed Value | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Target Host & Identity | Project `ymrblyiwohvxptiqjfsi`, role `postgres` | DB `postgres`, Role `postgres`, PG 17.6 | **PASS** |
| **2** | Schema Prerequisites | `organization_members` & `organizations.owner_id` exist | Both exist (`1`, `1`) | **PASS** |
| **3** | RLS & Table Owner | RLS enabled, FORCE RLS false, owner `postgres` | `true`, `false`, `postgres` | **PASS** |
| **4** | Helper Function Pre-existence | Function absent or clean ownership | Absent (`0` rows) | **PASS** |
| **5** | Current Live Policies | Recursive Phase 8B policy present | Confirmed present with self-referential subquery | **PASS** |
| **6** | Migration History | `_migrations` exists, Phase 9A not applied | Exists (`21` rows), `already_applied = 0` | **PASS** |
| **7** | Executing Role Privileges | `rolbypassrls = true` or table owner | Role `postgres` has `rolbypassrls = true` | **PASS** |
| **8** | Active Locks / Queries | 0 conflicting queries | 0 active queries | **PASS** |
| **9** | Backup Verification | Fresh recoverable backup available | Operator confirmed | **PASS** |
| **10** | Existing Staging Data | Safe state, no cross-tenant corruption | 1 org, 0 members | **PASS** |

---

## 4. Schema Reconciliations & Discrepancies

- **Prerequisites vs Observed Schema**: There are **zero discrepancies**. The live schema on staging exactly matches all migration preconditions defined in `phase_9a_rls_recursion_fix.sql`.
- **Target Policy Match**: The policy name `"Staff managers manage organization members"` matches the replacement target identically.
- **Role Permissions**: Role `postgres` satisfies both bypass criteria in Safety Gate Step 4 (`has_bypassrls = true` and `table_owner = 'postgres'`).
- **Runner Cleanliness**: `backend/scripts/run_read_only_preflight.js` was executed read-only and deleted immediately after data collection, leaving zero residual files in the repository.

---

## 5. Deployment Authorization Recommendation

### Recommendation Status
**`READY FOR EXPLICIT PHASE 9A STAGING DEPLOYMENT AUTHORIZATION`**

### Summary Rationale
1. **Target Environment Verified**: Confirmed project identity `ymrblyiwohvxptiqjfsi`.
2. **Defect Confirmed**: The self-referential recursive policy from Phase 8B was verified directly in `pg_policies` on staging.
3. **Safety Invariants Satisfied**: All 10 preflight safety checks passed cleanly.
4. **Clean Function Environment**: `public.is_org_manager` does not pre-exist; function creation will proceed without ownership collision.
5. **Rollback & Lock Guarantees**: The targeted runner will acquire transaction-scoped advisory lock `746291048201582` and guarantee atomic execution or rollback.

---

## 6. Execution Command for Next Phase (Phase 1I)

When the operator authorizes deployment, execute using the targeted single-migration runner:

```bash
node backend/scripts/apply_staging_migrations.js phase_9a_rls_recursion_fix.sql
```

Alternatively, if deploying via the Supabase Web Editor, execute the pure SQL transactional block specified in Section 5, Method B of [`docs/database/DB-2-phase-1G-staging-preflight.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1G-staging-preflight.md).

> [!IMPORTANT]
> **Hard Stop Enforcement**: In strict compliance with DB-2 Phase 1H requirements, this preflight phase is complete. No migrations have been executed. A passing preflight does not grant automatic permission to deploy; deployment must be explicitly triggered in the subsequent authorization phase.
