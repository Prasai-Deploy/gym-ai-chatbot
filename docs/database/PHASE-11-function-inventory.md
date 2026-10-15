# STRIVA V2 — Phase 11: Database Function Inventory & Security Inspection

**Date:** 2026-10-13  
**Auditor:** Antigravity (STRIVA V2 Quality & Security Architecture Gate)  
**Target Reference:** Phase 11 Pre-Launch Hardening Preparation  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Staging Migration Baseline:** Strictly 25 migrations through Phase 10B  
**Mode:** Read-Only Static and Catalog Analysis (Zero DDL, Zero DML, Zero RPC Mutations)  
**Deliverable File:** `docs/database/PHASE-11-function-inventory.md`  

---

## 1. Executive Summary & Audit Context

As part of the preparation for **DB-5 Pre-Launch Hardening**, this report delivers an exhaustive, evidence-based audit of all database functions and routines in the STRIVA V2 system.

The objectives of this routine audit are:
1. Identify all `SECURITY DEFINER` routines in exposed database schemas.
2. Inspect routines flagged by the latest Supabase Security Advisor (specifically `function_search_path_mutable` and exposed executable permissions).
3. Trace every database trigger and its backing routine.
4. Identify all routines invoked within Row Level Security (RLS) policies.
5. Determine exact execution grants across database roles (`PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres`).
6. Verify candidate stored procedures for DB-5 (e.g. `public.reset_demo_account(UUID)`).

### Strict Safety Invariants Observed
- **Zero Database Mutations**: No DDL, DML, routine recreation, grant revocation, or configuration changes were executed.
- **Production Isolation**: Production database was not accessed or connected to.
- **Evidence-Based Catalog Evaluation**: Catalog baseline from `audit_results.json`, active migration files (`backend/supabase/migrations/`), test suites (`backend/tests/`), and application codebases (`backend/src/`, `src/`) were inspected.

---

## 2. Query & Search Methodology

To ensure no routine was overlooked through simple text grep alone, routine extraction combined four distinct analysis vectors:
1. **Catalog Snapshot Analysis**: Inspection of routines recorded in `docs/database/audit_results.json` extracted from the live PostgreSQL catalog of `ymrblyiwohvxptiqjfsi`.
2. **Applied Migration Analysis**: Extraction of all `CREATE FUNCTION` and `CREATE TRIGGER` statements across the 25 migrations applied in staging (`008_multi_tenant_saas_foundation.sql` through `phase_10b_workout_core_schema.sql`, plus the 10 initial migrations from 2026-06-30).
3. **Prototyping Migration Review**: Review of the 13 unapplied prototyping migrations in `backend/supabase/migrations/` (e.g. `001_identity_domain.sql`, `011_phase3_tenant_rls_consolidation.sql`, `phase_4a_identity_bridge.sql`) to detect phantom or orphaned function references.
4. **Application Consumer Tracing**: Codebase search across backend repositories, services, Express routes, and frontend API clients for `rpc('...')` calls, SQL queries, and policy dependencies.

---

## 3. High-Level Function Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              STRIVA V2 DATABASE ROUTINE MASTER AUDIT                                                │
├──────────────────────────────────────┬─────────────┬──────────────┬─────────────────────┬──────────────┬──────────────┬─────────────┤
│ Routine Signature                    │ Sec Mode    │ Owner        │ search_path         │ On Staging?  │ In Migrations│ Risk Status │
├──────────────────────────────────────┼─────────────┼──────────────┼─────────────────────┼──────────────┼──────────────┼─────────────┤
│ public.handle_new_user()             │ DEFINER     │ postgres     │ public (MUTABLE)    │ YES          │ Phase 7B     │ FIX IN DB-5 │
│ public.is_org_member(UUID)           │ DEFINER     │ postgres     │ public (MUTABLE)    │ YES          │ Phase 8B     │ FIX IN DB-5 │
│ public.is_org_manager(UUID)          │ DEFINER     │ postgres     │ pg_catalog, pg_temp │ YES          │ Phase 9A     │ HARDENED OK │
│ public.sync_water_logs_compatibility │ DEFINER     │ postgres     │ pg_catalog, pg_temp │ YES          │ Phase 9B     │ HARDENED OK │
│ public.enforce_workout_session_state │ INVOKER     │ postgres     │ NONE (MUTABLE)      │ YES          │ Phase 10B    │ FIX IN DB-5 │
│ public.is_admin()                    │ N/A         │ N/A          │ N/A                 │ NO           │ NO           │ NOT A DB FN │
│ public.get_admin_role()              │ N/A         │ N/A          │ N/A                 │ NO           │ NO           │ NOT A DB FN │
│ public.rls_auto_enable()             │ N/A         │ N/A          │ N/A                 │ NO           │ NO           │ NOT A DB FN │
│ public.reset_demo_account(UUID)      │ DEFINER     │ N/A (Cand.)  │ pg_catalog, pg_temp │ NO           │ NO (Cand.)   │ DB-5 PREREQ │
│ public.get_auth_user_id()            │ DEFINER     │ N/A          │ public              │ NO           │ 011 (Skipped)│ PROTOTYPE   │
│ public.update_modified_column()      │ INVOKER     │ N/A          │ NONE                │ NO           │ 001 (Skipped)│ PROTOTYPE   │
└──────────────────────────────────────┴─────────────┴──────────────┴─────────────────────┴──────────────┴──────────────┴─────────────┘
```

---

## 4. Deep-Dive Routine Profiles

---

### 4.1 `public.handle_new_user()`
- **Schema & Name:** `public.handle_new_user()`
- **Returns:** `trigger`
- **Security Mode:** `SECURITY DEFINER`
- **Owner Role:** `postgres` (with `rolbypassrls = true`)
- **Configured `search_path`:** `'public'` (Flagged by Security Advisor: `function_search_path_mutable`)
- **Current Definition:**
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  BEGIN
      -- 1. Identity, fitness profile, preferences, and settings provisioning
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

      -- 2. Subscription & Trial Provisioning
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
  $function$;
  ```
- **Execute Grants & Exposure:**
  - `PUBLIC`: Retains default execution grant (Inherited from PostgreSQL default routine creation).
  - `anon`: Has execute via `PUBLIC`.
  - `authenticated`: Has execute via `PUBLIC`.
  - `service_role`: Has execute.
  - `postgres`: Owner.
  - *PostgREST Exposure*: Because this function returns type `trigger`, PostgREST schema cache does not expose it as an RPC endpoint (`/rpc/handle_new_user` returns 404). However, least-privilege standards dictate revoking execution from untrusted roles.
- **Trigger Callers:** Invoked by trigger `on_auth_user_created` on `auth.users AFTER INSERT FOR EACH ROW`.
- **Policy Callers:** None.
- **Backend / Repository Callers:** None (Executed exclusively by PostgreSQL internal trigger engine).
- **Presence Status:** Present on live staging catalog (`audit_results.json`) and migration `phase_7b_trial_foundation.sql`.
- **Risk Analysis:**
  - High risk of search path hijacking due to `SET search_path TO 'public'`. If an attacker creates malicious objects in `public`, they could execute arbitrary logic with `postgres` superuser privileges during user signup.
- **Remediation Specification (DB-5):**
  - Change to `SET search_path = pg_catalog, pg_temp`.
  - Explicitly schema-qualify all table calls (`public.profiles`, `public.v2_fitness_profiles`, `public.user_preferences`, `public.member_settings`, `public.subscriptions`).
  - Execute:
    ```sql
    REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role, postgres;
    ```

---

### 4.2 `public.is_org_member(target_org_id UUID)`
- **Schema & Name:** `public.is_org_member(target_org_id uuid)`
- **Returns:** `boolean`
- **Security Mode:** `STABLE SECURITY DEFINER`
- **Owner Role:** `postgres`
- **Configured `search_path`:** `'public'` (Flagged by Security Advisor: `function_search_path_mutable`)
- **Current Definition:**
  ```sql
  CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
  $function$;
  ```
- **Execute Grants & Exposure:**
  - `PUBLIC`: Retained default grant.
  - `anon`: Has execute via `PUBLIC`.
  - `authenticated`: Has execute via `PUBLIC`.
  - `service_role`: Has execute.
  - *PostgREST Exposure*: Function is callable via PostgREST RPC (`/rpc/is_org_member`). While it safely evaluates `auth.uid() IS NULL` and returns `FALSE` for anonymous callers, exposing multi-tenant helper functions to unauthenticated callers violates least-privilege principles and is flagged by Security Advisor.
- **Trigger Callers:** None.
- **Policy Callers:** Invoked by RLS policies across 8 core multi-tenant tables:
  1. `organizations`: `"Members view assigned organization"`
  2. `organization_locations`: `"Members view organization locations"`
  3. `organization_branding`: `"Members view organization branding"`
  4. `organization_settings`: `"Staff view organization settings"`
  5. `organization_invitations`: `"Staff view organization invitations"`
  6. `organization_members`: `"Members view tenant memberships"`
  7. `trainer_member_assignments`: `"View organization trainer assignments"`
  8. `organization_audit_logs`: `"System insert audit logs"`
  9. `v2_workout_plans`: `"v2_workout_plans_member_select"` (Phase 10B)
  10. `v2_workout_sessions`: `"v2_workout_sessions_member_select"` (Phase 10B)
  11. `exercise_sets`: `"exercise_sets_session_scope"` (Phase 10B)
- **Backend / Repository Callers:** Called indirectly whenever the backend queries tenant-scoped tables under user JWT context.
- **Presence Status:** Present on live staging catalog and migration `phase_8b_organization_staff_foundation.sql`.
- **Risk Analysis:**
  - Mutable search path allows search-path manipulation during policy evaluation.
  - Execution granted to anonymous role exposes routine to unauthorized RPC calls.
- **Remediation Specification (DB-5):**
  - Change to `SET search_path = pg_catalog, pg_temp`.
  - Fully schema-qualify `public.organization_members` and `public.organizations`.
  - Execute:
    ```sql
    REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM anon;
    GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated, service_role;
    ```

---

### 4.3 `public.is_org_manager(target_org_id UUID)`
- **Schema & Name:** `public.is_org_manager(target_org_id uuid)`
- **Returns:** `boolean`
- **Security Mode:** `STABLE SECURITY DEFINER`
- **Owner Role:** `postgres`
- **Configured `search_path`:** `pg_catalog, pg_temp` (Verified hardened in Phase 9A)
- **Current Definition:**
  ```sql
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
  ```
- **Execute Grants & Exposure:**
  - `PUBLIC`: Revoked (Verified in `DB-2 Phase 1I Check 3`).
  - `anon`: Revoked.
  - `authenticated`: Granted.
  - `service_role`: Granted.
  - `postgres`: Owner.
- **Trigger Callers:** None.
- **Policy Callers:** Invoked by policy `"Staff managers manage organization members"` on `public.organization_members` (`FOR ALL`).
- **Backend / Repository Callers:** Used in Gym Owner OS staff management, member invitation, and role promotion routes.
- **Presence Status:** Present on live staging catalog and migration `phase_9a_rls_recursion_fix.sql`.
- **Audit Determination:** **VERIFIED FULLY HARDENED & COMPLIANT**. Zero changes required.

---

### 4.4 `public.sync_water_logs_compatibility()`
- **Schema & Name:** `public.sync_water_logs_compatibility()`
- **Returns:** `trigger`
- **Security Mode:** `SECURITY DEFINER`
- **Owner Role:** `postgres`
- **Configured `search_path`:** `pg_catalog, pg_temp` (Verified hardened in Phase 9B)
- **Current Definition:**
  Trigger function defined in `phase_9b_legacy_identity_bridge.sql`. Validates strictly positive volume, deterministically mirrors `amount_ml` <-> `intake_amount`, and translates legacy integer `user_id` <-> UUID `profile_id` via `public.legacy_user_id_map`.
- **Execute Grants & Exposure:**
  - Trigger function; PostgREST does not expose it as an RPC.
  - `PUBLIC`: Unprivileged default trigger execution.
- **Trigger Callers:** Invoked by trigger `trg_sync_water_logs_compatibility` on `public.water_logs BEFORE INSERT OR UPDATE FOR EACH ROW`.
- **Policy Callers:** None.
- **Backend / Repository Callers:** `NutritionRepository.ts` hydration logging.
- **Presence Status:** Present on live staging catalog and migration `phase_9b_legacy_identity_bridge.sql`.
- **Audit Determination:** **VERIFIED FULLY HARDENED & COMPLIANT**. Zero changes required.

---

### 4.5 `public.enforce_workout_session_state_transition()`
- **Schema & Name:** `public.enforce_workout_session_state_transition()`
- **Returns:** `trigger`
- **Security Mode:** `SECURITY INVOKER`
- **Owner Role:** `postgres`
- **Configured `search_path`:** None (Default/mutable; flagged by Security Advisor)
- **Current Definition:**
  ```sql
  CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
  RETURNS trigger AS $$
  BEGIN
      IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
          RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
- **Execute Grants & Exposure:** Standard trigger execution.
- **Trigger Callers:** Invoked by trigger `trg_enforce_workout_session_state_transition` on `public.v2_workout_sessions BEFORE UPDATE OF state FOR EACH ROW`.
- **Policy Callers:** None.
- **Backend / Repository Callers:** `V2WorkoutSessionRepository.ts:transitionState()`.
- **Presence Status:** Present on live staging catalog and migration `phase_10b_workout_core_schema.sql`.
- **Risk Analysis:**
  - Lacks pinned `search_path`, causing Security Advisor to flag it under `function_search_path_mutable`.
- **Remediation Specification (DB-5):**
  - Recreate with `SET search_path = pg_catalog, pg_temp`.

---

### 4.6 Functions Investigated & Confirmed Non-Existent

The audit explicitly verified the presence or absence of the following routines requested in the specification:

1. **`public.is_admin()`**:
   - **Catalog Search:** Found 0 occurrences in `audit_results.json` and 0 occurrences in migration files.
   - **Origin of Reference:** Legacy table `public.users` contained a column `is_admin BOOLEAN DEFAULT false`. In modern STRIVA V2, admin authorization is enforced in Express middleware (`backend/src/middleware/auth.ts:requireAdmin`) checking verified Supabase Auth JWT claims and `organization_members.role`.
   - **Determination:** **Does NOT exist in the database catalog.** No function to drop or alter.

2. **`public.get_admin_role()`**:
   - **Catalog Search:** Found 0 occurrences across migrations, catalog snapshots, and codebase.
   - **Origin of Reference:** Role types are handled in TypeScript domain schemas (`AdminSchemas.ts`, `OrganizationSchemas.ts`).
   - **Determination:** **Does NOT exist in the database catalog.**

3. **`public.rls_auto_enable()`**:
   - **Catalog Search:** Found 0 occurrences in the staging catalog and migrations.
   - **Origin of Reference:** Common Supabase starter boilerplate event trigger. In STRIVA V2, RLS was enabled via explicit DDL commands (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) in versioned migration scripts.
   - **Determination:** **Does NOT exist in the database catalog.**

4. **`public.reset_demo_account(uuid)`**:
   - **Catalog Search:** Found 0 occurrences in live staging catalog and 0 occurrences in applied migrations.
   - **Origin of Reference:** Documented in `DB-4N`, `DB-4O`, and `PHASE-11-readiness-audit.md` as an **architectural prerequisite** for DB-5 to replace the sequential HTTP loop in `IdentityRepository.resetDemoData()`.
   - **Determination:** **Candidate routine for DB-5. Does NOT currently exist in staging.**

5. **`public.get_auth_user_id()`**:
   - **Catalog Search:** Present only in unapplied prototyping migration `011_phase3_tenant_rls_consolidation.sql`. Absent from `audit_results.json` and `_migrations`.
   - **Determination:** Unapplied prototype. `auth.uid()` is used directly across canonical migrations.

6. **`public.update_modified_column()`**:
   - **Catalog Search:** Present only in unapplied prototyping migrations (`001_identity_domain.sql`, `phase_4a_identity_bridge.sql`, `phase_7a_billing.sql`). Absent from `audit_results.json` and `_migrations`.
   - **Determination:** Unapplied prototype. Standard tables manage timestamps in domain repositories.

---

## 5. Security Advisor Findings Trace & Exposure Assessment

| Advisor Check ID | Routine Flagged | Actual Root Cause | Severity | Planned Fix |
| :--- | :--- | :--- | :---: | :--- |
| `function_search_path_mutable` | `public.handle_new_user()` | `SET search_path TO 'public'` | **HIGH** | Set `search_path = pg_catalog, pg_temp` |
| `function_search_path_mutable` | `public.is_org_member(UUID)` | `SET search_path = public` | **HIGH** | Set `search_path = pg_catalog, pg_temp` |
| `function_search_path_mutable` | `public.enforce_workout_session_state_transition()` | Missing `SET search_path` | **MEDIUM** | Set `search_path = pg_catalog, pg_temp` |
| `exposed_security_definer` | `public.is_org_member(UUID)` | Unrevoked execution grant to `PUBLIC` / `anon` | **HIGH** | `REVOKE FROM PUBLIC, anon; GRANT TO authenticated, service_role` |
| `exposed_security_definer` | `public.handle_new_user()` | Unrevoked default execution grant to `PUBLIC` | **MEDIUM** | `REVOKE FROM PUBLIC, anon, authenticated; GRANT TO supabase_auth_admin, service_role, postgres` |

---

## 6. Audit Conclusions & DB-5 Prerequisites

1. **Exactly Three Routines Require Hardening in DB-5:**
   - `public.handle_new_user()`: Pin search path, schema-qualify tables, restrict grants.
   - `public.is_org_member(UUID)`: Pin search path, schema-qualify tables, revoke `PUBLIC`/`anon` execution.
   - `public.enforce_workout_session_state_transition()`: Pin search path.
2. **Exactly One Candidate Routine to Add in DB-5:**
   - `public.reset_demo_account(target_user_id UUID)`: Add as atomic `SECURITY DEFINER` stored procedure owned by `postgres` with `search_path = pg_catalog, pg_temp`, granted strictly to `service_role`.
3. **Two Routines Verified 100% Compliant (Must Not Be Changed):**
   - `public.is_org_manager(UUID)`: Retain existing Phase 9A definition.
   - `public.sync_water_logs_compatibility()`: Retain existing Phase 9B definition.
4. **Zero Impact on RLS Policies:**
   Because routine signatures (`is_org_member(UUID)`, `handle_new_user()`) remain 100% identical, no dependent RLS policies need to be dropped or recreated during routine hardening.
