# STRIVA V2 — Phase 11 / DB-5: Test & Rollback Plan

**Date:** 2026-10-13  
**Auditor & Verification Lead:** Antigravity (STRIVA V2 Quality & Security Architecture Gate)  
**Target Reference:** Phase 11 / DB-5 Pre-Launch Hardening Verification & Recovery Specification  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Staging Migration Baseline:** Strictly 25 migrations through Phase 10B  
**Mode:** Planning and Local Preparation Only (Zero DDL, Zero DML, Zero Remote Execution)  
**Target Migration Draft:** [`backend/supabase/migrations/phase_11_prelaunch_hardening.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_11_prelaunch_hardening.sql)  
**Deliverable Document:** `docs/database/PHASE-11-DB5-test-and-rollback-plan.md`  

---

## 1. Executive Summary & Strategy

This document establishes the comprehensive test specification, verification criteria, preflight safety gates, and rollback runbooks for **DB-5 Pre-Launch Hardening**.

### Strict Discipline on Verification Evidence
In accordance with engineering integrity standards:
- **Tests Already Executed**: Baseline tests that passed in the disposable test cluster and unit environments (e.g. 91/91 tests in DB-4O) are explicitly labeled with execution timestamps, suite paths, and pass counts.
- **Tests Planned for DB-5**: Test assertions designed to validate the new DB-5 hardening items (dropping `profiles.organization_id` default, `reset_demo_account` stored procedure, and search path pinning) are explicitly labeled as **`PLANNED — PENDING LOCAL TEST EXECUTION`**. No future test will be claimed as passing without concrete execution logs.

---

## 2. Test Specification for DB-5 Hardening Items

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DB-5 TEST ASSERTION CATALOG                                         │
├──────┬───────────────────────────────┬──────────────────────────────┬──────────────────────────────────┤
│ Test │ Domain Scope                  │ Verification Assertion       │ Evidence Status                  │
├──────┼───────────────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ T-01 │ Tenant Default Drop           │ Profiles created with NULL   │ PLANNED (Specification Ready)    │
│ T-02 │ Tenant Assignment             │ Explicit authorized org set  │ PLANNED (Specification Ready)    │
│ T-03 │ Cross-Tenant Access           │ Unassigned/cross-tenant 403  │ PLANNED (Specification Ready)    │
│ T-04 │ Atomic Demo Reset Success     │ Child-before-parent clean del│ PLANNED (Specification Ready)    │
│ T-05 │ Atomic Rollback Injection     │ Mid-operation fault -> 0 del │ PLANNED (Specification Ready)    │
│ T-06 │ Demo Reset Authorization      │ Non-demo target fails closed │ PLANNED (Specification Ready)    │
│ T-07 │ Routine Search Path Pinning   │ search_path pg_catalog/temp  │ PLANNED (Specification Ready)    │
│ T-08 │ Routine Privilege Lockdown    │ anon/PUBLIC execute blocked  │ PLANNED (Specification Ready)    │
│ T-09 │ handle_new_user Context       │ auth.users trigger succeeds  │ PLANNED (Specification Ready)    │
│ T-10 │ Regression Baseline Suite     │ 91/91 baseline tests pass    │ EXECUTED (Passed in DB-4O)       │
└──────┴───────────────────────────────┴──────────────────────────────┴──────────────────────────────────┘
```

---

### Detailed Test Specifications

#### Test T-01: Profile Creation Without Organization Assignment
- **Objective:** Verify that dropping the column default on `public.profiles.organization_id` results in `NULL` for newly created profiles.
- **Execution Method (Planned):**
  ```sql
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'unassigned_member@test.com', 'Unassigned Member')
  RETURNING id, organization_id;
  ```
- **Expected Assertion:** `organization_id` is strictly `NULL`. No fallback literal `'00000000-0000-0000-0000-000000000001'` is present.
- **Status:** **PLANNED**

#### Test T-02: Explicitly Authorized Organization Assignment
- **Objective:** Verify that explicitly providing a valid organization UUID during profile creation or invitation acceptance assigns the organization correctly.
- **Execution Method (Planned):**
  ```sql
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (gen_random_uuid(), 'assigned_member@test.com', 'Assigned Member', 'c0000000-0000-0000-0000-000000000001'::uuid)
  RETURNING id, organization_id;
  ```
- **Expected Assertion:** `organization_id` matches the supplied UUID. Foreign key to `public.organizations(id)` evaluates valid.
- **Status:** **PLANNED**

#### Test T-03: Cross-Tenant Denial for Unassigned Profiles
- **Objective:** Verify that an unassigned profile (`organization_id = NULL`) attempting to access tenant-scoped routes is denied with `HTTP 403 Forbidden`.
- **Execution Method (Planned):**
  - Authenticate as unassigned profile.
  - Send `GET /api/v1/owner/members` and `POST /api/v1/attendance/checkin`.
- **Expected Assertion:** `tenantMiddleware` resolves `orgContext.organizationId = null`, halts pipeline, and returns `403 Forbidden` (`{ success: false, error: { message: "Organization access required" } }`).
- **Status:** **PLANNED**

#### Test T-04: Atomic Demo Reset Clean Execution
- **Objective:** Verify `public.reset_demo_account(UUID)` cleanly removes all demo activity records while preserving legitimate member data and excluded demo identity records.
- **Execution Method (Planned):**
  - Seed demo user (`demo@sweatfix.com`) with workout session, exercise sets, nutrition logs, and water logs.
  - Seed non-demo member (`member@test.com`) with identical record types.
  - Invoke `SELECT public.reset_demo_account('<demo-user-uuid>');` under role `service_role`.
- **Expected Assertion:**
  - Demo `exercise_sets`, `v2_workout_sessions`, `v2_nutrition_logs`, `water_logs` count = 0.
  - Non-demo member records count = 100% untouched.
  - Demo `profiles`, `subscriptions`, and `member_settings` count = 100% intact.
- **Status:** **PLANNED**

#### Test T-05: Atomic Rollback Injection Test
- **Objective:** Verify that an injected failure halfway through `reset_demo_account` causes PostgreSQL to abort the transaction and roll back 100% of deletions.
- **Execution Method (Planned):**
  - In a disposable test transaction, inject an intentional runtime error (e.g. invalid SQL or check violation) into the middle of `reset_demo_account`.
  - Execute procedure.
- **Expected Assertion:** Transaction aborts with error; zero rows are deleted from any table (`exercise_sets`, `v2_workout_sessions`, `v2_nutrition_logs` retain pre-call state).
- **Status:** **PLANNED**

#### Test T-06: Demo Reset Authorization & Caller Lockdown
- **Objective:** Verify that non-demo targets are rejected, and anonymous/authenticated callers cannot execute the RPC.
- **Execution Method (Planned):**
  1. Call `reset_demo_account` targeting a non-demo user UUID (`member@test.com`) under `service_role`.
  2. Call `reset_demo_account` as role `anon` and `authenticated`.
- **Expected Assertion:**
  1. Raises exception: `Security violation: reset_demo_account is restricted strictly to verified demo accounts`.
  2. Call from `anon` or `authenticated` fails with PostgreSQL error `42501: permission denied for function reset_demo_account`.
- **Status:** **PLANNED**

#### Test T-07: Routine Search Path Verification
- **Objective:** Verify that `handle_new_user`, `is_org_member`, and `enforce_workout_session_state_transition` reflect pinned search paths in `pg_proc`.
- **Execution Method (Planned):**
  ```sql
  SELECT proname, prosecdef, proconfig 
  FROM pg_proc 
  WHERE proname IN ('handle_new_user', 'is_org_member', 'enforce_workout_session_state_transition')
    AND pronamespace = 'public'::regnamespace;
  ```
- **Expected Assertion:** `proconfig` contains `["search_path=pg_catalog, pg_temp"]` for all three routines.
- **Status:** **PLANNED**

#### Test T-08: Routine Execution Privilege Lockdown
- **Objective:** Verify that routine execution is revoked from `PUBLIC` and `anon`.
- **Execution Method (Planned):**
  ```sql
  SELECT routine_name, grantee, privilege_type 
  FROM information_schema.routine_privileges 
  WHERE routine_schema = 'public' 
    AND routine_name IN ('is_org_member', 'reset_demo_account');
  ```
- **Expected Assertion:** Zero entries for `PUBLIC` and `anon`. Only `authenticated` and `service_role` (for `is_org_member`) or `service_role` (for `reset_demo_account`).
- **Status:** **PLANNED**

#### Test T-09: `handle_new_user()` Trigger Execution Context
- **Objective:** Verify that user creation in `auth.users` succeeds under `supabase_auth_admin` context without permission errors.
- **Execution Method (Planned):**
  - Simulate Supabase Auth registration trigger on `auth.users`.
- **Expected Assertion:** Trigger fires, executes `handle_new_user()`, provisions `profiles`, `v2_fitness_profiles`, `user_preferences`, `member_settings`, and `subscriptions` with 14-day trial.
- **Status:** **PLANNED**

---

## 3. Regression Baseline Matrix (Tests Already Executed)

All 5 core suites totaling **91 assertions** were verified in DB-4O on 2026-10-13 against real PostgreSQL 18.3 and unit test environments with **zero failures**:

| Suite Path | Category | Total Tests | Passed | Execution Time | Result |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `tests/integration/db4_real_postgres.integration.test.ts` | Real PG 18 Integration | 15 | 15 | 1.95s | **PASS** |
| `tests/integration/db4l_real_postgres_remediation.integration.test.ts` | Real PG 18 Integration | 3 | 3 | 65ms | **PASS** |
| `tests/integration/db4o_postgres_remediation_verification.integration.test.ts` | Real PG 18 Integration | 4 | 4 | 112ms | **PASS** |
| `backend/tests/unit/db4n_acceptance_remediation.unit.test.ts` | Unit & Contract | 16 | 16 | 15ms | **PASS** |
| `backend/tests/unit/db4l_remediation_regression.unit.test.ts` | Unit & Contract | 15 | 15 | 15ms | **PASS** |
| `backend/tests/unit/db4_nutrition_workout_contracts.unit.test.ts` | Contract Validation | 9 | 9 | 12ms | **PASS** |
| `backend/tests/security/cross_user_isolation.security.test.ts` | Security & Isolation | 10 | 10 | 59ms | **PASS** |
| `backend/tests/security/phase5_domain_apis.security.test.ts` | Security & Domain APIs| 19 | 19 | 96ms | **PASS** |
| **TOTAL VERIFIED REGRESSION BASELINE** | | **91** | **91** | | **100% PASS** |

---

## 4. Migration Safety & Advisory Locking Protocol

### 4.1 Advisory Lock Key Requirement
- **Lock Identifier:** `746291048201582` (64-bit PostgreSQL advisory lock).
- **Enforcement:** The migration draft `phase_11_prelaunch_hardening.sql` includes:
  ```sql
  SELECT pg_advisory_xact_lock(746291048201582);
  ```
  This guarantees that concurrent migrations or out-of-band runners cannot modify the database catalog simultaneously. The lock is held within the transaction and released automatically on `COMMIT` or `ROLLBACK`.

### 4.2 Pre-Migration Backup Checkpoint Invariant
Before applying DB-5 to staging (`ymrblyiwohvxptiqjfsi`), the operator must verify:
- **Supabase Point-In-Time-Recovery (PITR)**: Confirmed active and continuous on the staging project.
- **Distinction Between Backups**: A logical DML export (such as `check_staging_tables.js` or data dumps) is **strictly insufficient** to recover from structural DDL mistakes, catalog corruptions, or trigger failures. A verified physical cluster snapshot or active PITR log window is mandatory.

---

## 5. Comprehensive Rollback Specification

If DB-5 deployment encounters a verification failure, the following rollback runbook must be executed:

### 5.1 In-Flight Transaction Abort (Automatic)
Because `phase_11_prelaunch_hardening.sql` is wrapped in an atomic transaction (`BEGIN ... COMMIT`), any PostgreSQL error during application immediately triggers `ROLLBACK`, leaving the database catalog 100% unchanged.

### 5.2 Post-Deployment Rollback Script (`rollback_phase_11_prelaunch_hardening.sql`)
If an issue is discovered after commitment during post-deployment verification:

```sql
BEGIN;

-- 1. Acquire advisory lock
SELECT pg_advisory_xact_lock(746291048201582);

-- 2. Drop additive demo reset procedure
DROP FUNCTION IF EXISTS public.reset_demo_account(UUID);

-- 3. Restore handle_new_user definition from Phase 7B
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.v2_fitness_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_preferences (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.member_settings (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;

    IF NEW.email = 'demo@sweatfix.com' THEN
        INSERT INTO public.subscriptions (
            user_id, tier, interval, status, provider,
            trial_started_at, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (
            NEW.id, 'free', 'monthly', 'active', 'razorpay',
            NULL, NULL, NOW(), NOW() + INTERVAL '100 years', FALSE
        ) ON CONFLICT (user_id) DO NOTHING;
    ELSE
        INSERT INTO public.subscriptions (
            user_id, tier, interval, status, provider,
            trial_started_at, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (
            NEW.id, 'pro', 'monthly', 'trialing', 'razorpay',
            NOW(), NOW() + INTERVAL '14 days', NOW(), NOW() + INTERVAL '14 days', FALSE
        ) ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 4. Restore is_org_member definition from Phase 8B
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL OR target_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = target_org_id
          AND om.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = target_org_id
          AND o.owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. Restore enforce_workout_session_state_transition definition from Phase 10B
CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
RETURNS trigger AS $$
BEGIN
    IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
        RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CAUTION ON PROFILES DEFAULT RESTORATION
-- Restoring the fallback tenant default:
-- ALTER TABLE public.profiles ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
-- WARNING: Restoring this default re-introduces the critical tenant isolation vulnerability (STRIVA Rule 6 violation).
-- It must only be restored if application code strictly fails to handle unassigned (NULL) profiles.

COMMIT;
```

### 5.3 Data Implications of Rollback
- **DDL Reversibility vs. Security Posture**: A migration is not truly "reversible" without security consequences. Restoring the `'00000000-0000-0000-0000-000000000001'` default on `profiles.organization_id` re-exposes unassigned user accounts to automatic tenant inheritance, violating AGENTS.md Rule 6.
- **Data Retention**: Dropping `reset_demo_account` leaves all existing table data untouched; it merely reverts the backend to sequential HTTP deletion.

---

## 6. Commercial Gate Declaration

- **Status:** B2B software tiers (`gym_starter`, `gym_growth`, `gym_enterprise`) operate with `amount_paise = NULL` and `is_configured = false`.
- **Declaration:** DB-5 contains zero billing pricing mutations. B2B online checkouts intentionally fail closed with `400 Bad Request` (`PLAN_NOT_CONFIGURED`) pending formal written stakeholder approval.

---

*Test & rollback plan complete. In strict adherence to safety constraints, zero remote database writes, migration applications, or production mutations occurred.*
