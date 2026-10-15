# STRIVA V2 — Phase 11 / DB-5O: Legacy Routine Security Audit Report

**Document Version:** 1.0.0  
**Audit Date / Local Time:** 2026-10-14 14:05 IST  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Staging Baseline:** Exactly 26 migrations recorded in `public._migrations`  
**Remote DDL/DML Applied in this Phase:** Strictly 0 (Read-only catalog inspection only)  
**Production Database Status:** Untouched & Protected  
**Working Tree Status:** All 45 modified files in `src/` and untracked artifacts strictly preserved  
**Audit Verdict:** **DB-5O AUDIT COMPLETE — REMEDIATION PLAN READY**

---

## 1. Executive Summary

In accordance with Phase 11 hardening requirements, an exhaustive, read-only remote security audit of the five remaining unhardened legacy PostgreSQL routines on staging project `ymrblyiwohvxptiqjfsi` was performed.

### Target Routines in Scope
1. `public.get_admin_role()` (OID: `18277`)
2. `public.is_admin()` (OID: `18276`)
3. `public.update_membership_statuses()` (OID: `18402`)
4. `public.update_modified_column()` (OID: `19103`)
5. `public.update_updated_at_column()` (OID: `17909`)

### Core Conclusions
1. **Catalog Scope & Advisor Alignment:** Out of 12 total routines in `public`, these 5 routines are the **only** remaining routines with mutable search paths (`proconfig IS NULL`). All other 7 routines (`reset_demo_account`, `handle_new_user`, `is_org_member`, `is_org_manager`, `sync_water_logs_compatibility`, `enforce_workout_session_state_transition`, `rls_auto_enable`) were previously hardened with pinned search paths.
2. **Execution Mode Rigor (`SECURITY DEFINER` vs. `SECURITY INVOKER`):**
   - **Trigger functions (`update_modified_column`, `update_updated_at_column`)**: Genuinely require `SECURITY INVOKER`. Converting row-level triggers to `SECURITY DEFINER` would introduce dangerous superuser escalation across 14 tables with zero functional justification.
   - **Scheduled maintenance (`update_membership_statuses`)**: Genuinely requires `SECURITY INVOKER`. It is invoked exclusively by `pg_cron` under the `postgres` superuser role (`jobid: 1`, `schedule: 0 0 * * *`). Converting it to `SECURITY DEFINER` would be unnecessary and would introduce elevation risks.
   - **Admin helpers (`get_admin_role`, `is_admin`)**: Currently configured as `SECURITY DEFINER`, but do **not** genuinely require it. Table `public.admins` already enables Row Level Security with policy `"Users can check own admin status"` allowing callers to select rows where `email = auth.jwt() ->> 'email'`. Because the routine functions only return data matching `auth.jwt() ->> 'email'`, they can safely be converted to `SECURITY INVOKER` (or remain `SECURITY DEFINER` with strictly pinned search paths and revoked public execution).
3. **Search Path Hijacking Vulnerabilities:**
   - Both `get_admin_role()` and `is_admin()` reference unqualified `FROM admins`, creating a direct search path injection vulnerability when executed as superuser `postgres`.
   - `update_membership_statuses()` references 4 unqualified tables (`memberships`, `membership_plans`, `user_workout_assignments`, `user_diet_assignments`).
   - `update_modified_column()` and `update_updated_at_column()` invoke unqualified `now()` / `NOW()`.
4. **Execution Grants & PostgREST Exposure:**
   - `get_admin_role()`, `is_admin()`, and `update_membership_statuses()` currently have `EXECUTE` granted to `PUBLIC`, `anon`, and `authenticated`.
   - PostgREST exposes all three over public HTTP endpoints (`/rest/v1/rpc/*`).
   - `update_membership_statuses()` can be invoked by unauthenticated users over the internet. While RLS default deny currently prevents data modification by `anon`, it consumes CPU/locks and is a critical denial-of-service / privilege leak hazard.
   - For `update_modified_column()`, `authenticated` **must** retain `EXECUTE` privilege because it backs 11 active `BEFORE UPDATE` triggers on user-modifiable tables (`profiles`, `user_preferences`, `v2_fitness_profiles`, `member_settings`). Revoking `EXECUTE` on this trigger from `authenticated` would immediately crash all user profile and preference updates.

---

## 2. Live Catalog Findings Matrix

| Routine Signature | OID | Mode | Current `search_path` | Owner | Raw `proacl` | Attached Triggers | Active Callers / Consumers | Risk Level |
| :--- | :---: | :---: | :---: | :---: | :--- | :---: | :--- | :---: |
| `public.get_admin_role()` | 18277 | `DEFINER` | `NULL` (Mutable) | `postgres` | `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres` | 0 | 0 in codebase; PostgREST `/rpc/get_admin_role` | **HIGH** |
| `public.is_admin()` | 18276 | `DEFINER` | `NULL` (Mutable) | `postgres` | `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres` | 0 | 0 in codebase; PostgREST `/rpc/is_admin` | **HIGH** |
| `public.update_membership_statuses()` | 18402 | `INVOKER` | `NULL` (Mutable) | `postgres` | `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres` | 0 | `pg_cron` (Daily 00:00 UTC); PostgREST `/rpc/update_membership_statuses` | **HIGH** |
| `public.update_modified_column()` | 19103 | `INVOKER` | `NULL` (Mutable) | `postgres` | `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres` | 11 triggers | Table UPDATEs across 11 V2 tables | **MEDIUM** |
| `public.update_updated_at_column()` | 17909 | `INVOKER` | `NULL` (Mutable) | `postgres` | `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres` | 3 triggers | Table UPDATEs across 3 legacy tables | **LOW** |

---

## 3. Routine-by-Routine Deep Dive & Risk Assessment

---

### 3.1 `public.get_admin_role()`

#### A. Live Definition
```sql
CREATE OR REPLACE FUNCTION public.get_admin_role()
 RETURNS character varying
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT role FROM admins 
  WHERE email = auth.jwt() ->> 'email'
  LIMIT 1;
$function$
```

#### B. Catalog & Security Attributes
- **OID:** 18277
- **Identity:** `get_admin_role() -> character varying`
- **Owner:** `postgres`
- **Execution Mode:** `SECURITY DEFINER` (`prosecdef = true`)
- **Configured `search_path`:** `NULL` (Mutable search path — inherits caller's session `search_path`)
- **Information Schema Grants:** `PUBLIC` (EXECUTE), `anon` (EXECUTE), `authenticated` (EXECUTE), `service_role` (EXECUTE), `postgres` (EXECUTE).
- **PostgREST RPC Endpoint:** Exposed at `POST /rest/v1/rpc/get_admin_role`.

#### C. Callers & Dependency Trace
- **Triggers:** None.
- **Policies:** None.
- **Dependent Objects in `pg_depend`:** None.
- **Application Codebase Callers:**
  - `backend/src/`: 0 callers.
  - `src/`: 0 callers.
  - STRIVA V2 uses `organization_members` for B2B staff roles, evaluated via Express middleware (`auth.middleware.ts`) and Supabase Auth JWT identity. The `admins` table is an unmigrated V1 artifact.

#### D. Risk Analysis & Search-Path Vulnerability
1. **Search Path Injection:** The routine executes as `postgres` (`SECURITY DEFINER`) without a pinned `search_path`. It references unqualified `admins`. A malicious user able to create a table or view named `admins` in a schema preceding `public` in the search path could hijack execution with superuser privileges.
2. **Public Enumeration:** Anonymous users can execute `/rest/v1/rpc/get_admin_role`. Because `auth.jwt()` is null for anonymous requests, it returns null, but the endpoint is publicly probeable.

#### E. Security Definer Requirement Evaluation
- **Genuinely Required?** **NO**.
- **Evidence:** Table `public.admins` has RLS enabled with policy:
  ```sql
  CREATE POLICY "Users can check own admin status" ON public.admins
    FOR SELECT TO public
    USING ((email)::text = (auth.jwt() ->> 'email'::text));
  ```
  Both `authenticated` and `anon` have `SELECT` privilege granted on `public.admins`. Because callers are already permitted by RLS to select their own admin row, this routine does not need to bypass RLS via `SECURITY DEFINER`.

#### F. Remediation Action
- Pin search path: `SET search_path = pg_catalog, pg_temp`.
- Schema-qualify table reference: `public.admins`.
- Revoke execution from `PUBLIC` and `anon`.
- Convert to `SECURITY INVOKER` (or retain `SECURITY DEFINER` with pinned search path and restricted grants).

---

### 3.2 `public.is_admin()`

#### A. Live Definition
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE email = auth.jwt() ->> 'email'
  );
$function$
```

#### B. Catalog & Security Attributes
- **OID:** 18276
- **Identity:** `is_admin() -> boolean`
- **Owner:** `postgres`
- **Execution Mode:** `SECURITY DEFINER` (`prosecdef = true`)
- **Configured `search_path`:** `NULL` (Mutable search path)
- **Information Schema Grants:** `PUBLIC` (EXECUTE), `anon` (EXECUTE), `authenticated` (EXECUTE), `service_role` (EXECUTE), `postgres` (EXECUTE).
- **PostgREST RPC Endpoint:** Exposed at `POST /rest/v1/rpc/is_admin`.

#### C. Callers & Dependency Trace
- **Triggers:** None.
- **Policies:** None.
- **Dependent Objects in `pg_depend`:** None.
- **Application Codebase Callers:** 0 callers in backend or frontend.

#### D. Risk Analysis
- Runs with `postgres` superuser privileges without pinned search path.
- References unqualified `admins`.
- Open to anonymous PostgREST invocation.

#### E. Security Definer Requirement Evaluation
- **Genuinely Required?** **NO**.
- Supported by the same RLS policy on `public.admins`. Can safely be `SECURITY INVOKER`.

#### F. Remediation Action
- Pin search path: `SET search_path = pg_catalog, pg_temp`.
- Schema-qualify: `public.admins`.
- Revoke execution from `PUBLIC` and `anon`.
- Convert to `SECURITY INVOKER`.

---

### 3.3 `public.update_membership_statuses()`

#### A. Live Definition
```sql
CREATE OR REPLACE FUNCTION public.update_membership_statuses()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Mark expired
  UPDATE memberships
  SET status = 'expired'
  WHERE expiry_date < CURRENT_DATE
  AND status != 'expired';

  -- Mark due soon (expiring within 7 days)
  UPDATE memberships
  SET status = 'due_soon'
  WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND status = 'active';

  -- When expired: deactivate workout and diet assignments for non-PT members
  UPDATE user_workout_assignments
  SET active = false
  WHERE user_id IN (
    SELECT m.user_id FROM memberships m
    JOIN membership_plans mp ON m.plan_id = mp.id
    WHERE m.status = 'expired'
    AND mp.name NOT ILIKE '%personal%'
  );

  UPDATE user_diet_assignments
  SET active = false
  WHERE user_id IN (
    SELECT m.user_id FROM memberships m
    JOIN membership_plans mp ON m.plan_id = mp.id
    WHERE m.status = 'expired'
    AND mp.name NOT ILIKE '%personal%'
  );
END;
$function$
```

#### B. Catalog & Security Attributes
- **OID:** 18402
- **Identity:** `update_membership_statuses() -> void`
- **Owner:** `postgres`
- **Execution Mode:** `SECURITY INVOKER` (`prosecdef = false`)
- **Configured `search_path`:** `NULL` (Mutable search path)
- **Information Schema Grants:** `PUBLIC` (EXECUTE), `anon` (EXECUTE), `authenticated` (EXECUTE), `service_role` (EXECUTE), `postgres` (EXECUTE).
- **PostgREST RPC Endpoint:** Exposed at `POST /rest/v1/rpc/update_membership_statuses`.

#### C. Active Scheduling & Dependency Trace
- **`pg_cron` Configuration:**
  - Active cron job verified on staging:
    ```
    jobid: 1
    schedule: '0 0 * * *'
    command: 'SELECT update_membership_statuses()'
    username: 'postgres'
    active: true
    ```
  - Execution history in `cron.job_run_details`: 10 consecutive daily successful executions recorded at 00:00:00 UTC, executing in ~100ms.
- **Triggers:** None.
- **Policies:** None.
- **Codebase Callers:** 0 callers in backend or frontend. Driven strictly by PostgreSQL internal cron scheduler.

#### D. Risk Analysis & Critical Findings
1. **Unauthenticated RPC Execution Surface:** Because `PUBLIC` and `anon` have `EXECUTE` privilege, any external client can call `POST /rest/v1/rpc/update_membership_statuses`.
2. **RLS Quarantine Behavior:** When called by `anon` or `authenticated`, the routine runs under that caller's credentials (`SECURITY INVOKER`). Tables `memberships`, `user_workout_assignments`, and `user_diet_assignments` have RLS enabled with 0 policies, enforcing a default deny. Thus, unprivileged HTTP callers currently update 0 rows, but waste DB CPU and table locking resources.
3. **Severe Risk if Converted to `SECURITY DEFINER`:** If an operator mistakenly converts `update_membership_statuses()` to `SECURITY DEFINER` without revoking `anon` and `authenticated` execution, any unauthenticated caller on the internet could instantly execute mass status modifications and deactivate member assignments as superuser `postgres`.
4. **Unqualified Table References:** References `memberships`, `membership_plans`, `user_workout_assignments`, `user_diet_assignments` without schema qualification.

#### E. Security Definer Requirement Evaluation
- **Genuinely Required?** **NO — MUST REMAIN `SECURITY INVOKER`**.
- **Rationale:** `pg_cron` executes the job directly as `postgres` (`username = 'postgres'`). The `postgres` role owns the tables and has superuser privileges. It does not require `SECURITY DEFINER`. Keeping it `SECURITY INVOKER` guarantees that non-superuser callers cannot elevate privileges.

#### F. Remediation Action
- Keep `SECURITY INVOKER`.
- Add `SET search_path = pg_catalog, pg_temp`.
- Schema-qualify all 4 tables (`public.memberships`, `public.membership_plans`, `public.user_workout_assignments`, `public.user_diet_assignments`).
- Fully schema-qualify operators and functions (`pg_catalog.current_date`).
- **REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM PUBLIC, anon, authenticated;**
- **GRANT EXECUTE ON FUNCTION public.update_membership_statuses() TO postgres, service_role;**

---

### 3.4 `public.update_modified_column()`

#### A. Live Definition
```sql
CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
```

#### B. Catalog & Security Attributes
- **OID:** 19103
- **Identity:** `update_modified_column() -> trigger`
- **Owner:** `postgres`
- **Execution Mode:** `SECURITY INVOKER` (`prosecdef = false`)
- **Configured `search_path`:** `NULL` (Mutable search path)
- **Information Schema Grants:** `PUBLIC` (EXECUTE), `anon` (EXECUTE), `authenticated` (EXECUTE), `service_role` (EXECUTE), `postgres` (EXECUTE).
- **PostgREST Exposure:** None (PostgREST does not expose trigger return types).

#### C. Attached Triggers (11 Core V2 Tables)
The routine is attached to 11 active `BEFORE UPDATE` triggers across STRIVA V2 tables:
1. `public.profiles` (`update_profiles_modtime`)
2. `public.v2_fitness_profiles` (`update_fitness_profiles_modtime`)
3. `public.user_preferences` (`update_user_preferences_modtime`)
4. `public.member_settings` (`update_member_settings_modtime`)
5. `public.progress_statistics` (`update_progress_stats_modtime`)
6. `public.ai_memory` (`update_ai_memory_modtime`)
7. `public.recovery_logs` (`update_recovery_logs_modtime`)
8. `public.user_goals` (`update_user_goals_modtime`)
9. `public.ai_conversations` (`update_ai_conversations_modtime`)
10. `public.subscriptions` (`update_subscriptions_modtime`)
11. `public.feature_usage` (`update_feature_usage_modtime`)

#### D. Risk Analysis & Sensitivity Warnings
1. **Search Path Mutability:** Function invokes `now()`, which is resolved via the caller's session `search_path`.
2. **Grant Sensitivity:** In PostgreSQL, whenever an `UPDATE` statement fires a trigger, the invoking database role must hold `EXECUTE` privilege on the trigger function. If `EXECUTE` were blindly revoked from `authenticated`, every authenticated user update to their profile, preferences, or conversation logs would immediately fail with error `42501 (permission denied for function update_modified_column)`.
3. **Execution Mode Sensitivity:** Trigger functions that merely update timestamps should **never** be `SECURITY DEFINER`.

#### E. Security Definer Requirement Evaluation
- **Genuinely Required?** **NO — MUST REMAIN `SECURITY INVOKER`**.

#### F. Remediation Action
- Keep `SECURITY INVOKER`.
- Add `SET search_path = pg_catalog, pg_temp`.
- Qualify function call as `pg_catalog.now()`.
- **PRESERVE EXECUTE grants** for `authenticated`, `service_role`, and `postgres`.
- `anon` may be revoked if no anonymous updates exist on any of the 11 tables, or left intact as a safe invoker trigger.

---

### 3.5 `public.update_updated_at_column()`

#### A. Live Definition
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
```

#### B. Catalog & Security Attributes
- **OID:** 17909
- **Identity:** `update_updated_at_column() -> trigger`
- **Owner:** `postgres`
- **Execution Mode:** `SECURITY INVOKER` (`prosecdef = false`)
- **Configured `search_path`:** `NULL` (Mutable search path)
- **Information Schema Grants:** `PUBLIC` (EXECUTE), `anon` (EXECUTE), `authenticated` (EXECUTE), `service_role` (EXECUTE), `postgres` (EXECUTE).

#### C. Attached Triggers (3 Legacy Tables)
1. `public.fitness_profiles` (`trg_fitness_profiles_updated_at`)
2. `public.user_stats` (`trg_user_stats_updated_at`)
3. `public.memberships` (`trg_memberships_updated_at`)

#### D. Risk Analysis & Remediation
- Must remain `SECURITY INVOKER`.
- Add `SET search_path = pg_catalog, pg_temp`.
- Qualify function call as `pg_catalog.now()`.
- Preserve `EXECUTE` grants for `authenticated`, `service_role`, and `postgres`.

---

## 4. Minimal Remediation Specification (Phase 12 Migration Candidate)

The following DDL represents the complete, minimal, and non-breaking remediation plan for a future migration file (e.g. `backend/supabase/migrations/phase_12_legacy_routine_hardening.sql`):

```sql
-- =============================================================================
-- STRIVA V2 — Phase 12: Legacy Routine Security Hardening
-- =============================================================================

-- 1. Hardening public.update_modified_column()
-- Must remain SECURITY INVOKER; preserve authenticated EXECUTE for 11 core update triggers.
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

REVOKE ALL ON FUNCTION public.update_modified_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_modified_column() TO authenticated, service_role, postgres;


-- 2. Hardening public.update_updated_at_column()
-- Must remain SECURITY INVOKER; preserve authenticated EXECUTE for legacy triggers.
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

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role, postgres;


-- 3. Hardening public.update_membership_statuses()
-- Must remain SECURITY INVOKER; executed by pg_cron as postgres.
-- Revoke PUBLIC, anon, authenticated to close PostgREST RPC attack surface.
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
  WHERE expiry_date < pg_catalog.current_date
  AND status != 'expired';

  -- Mark due soon (expiring within 7 days)
  UPDATE public.memberships
  SET status = 'due_soon'
  WHERE expiry_date BETWEEN pg_catalog.current_date AND pg_catalog.current_date + INTERVAL '7 days'
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

REVOKE ALL ON FUNCTION public.update_membership_statuses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_statuses() TO postgres, service_role;


-- 4. Hardening public.is_admin()
-- Convert to SECURITY INVOKER (or keep DEFINER with pinned path).
-- Schema qualify public.admins and revoke anon/PUBLIC execution.
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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;


-- 5. Hardening public.get_admin_role()
-- Convert to SECURITY INVOKER (or keep DEFINER with pinned path).
-- Schema qualify public.admins and revoke anon/PUBLIC execution.
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

REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO authenticated, service_role, postgres;
```

---

## 5. Testing & Verification Plan

Before and after applying this remediation in a future controlled deployment, the following automated checks must be executed:

1. **Trigger Functional Verification:**
   - Execute an `UPDATE` on `public.profiles` as an `authenticated` user. Verify that `updated_at` advances to `now()` and no `42501 permission denied` error is raised.
   - Execute an `UPDATE` on `public.user_preferences` and `public.v2_fitness_profiles`. Confirm `update_modified_column()` triggers successfully.
2. **Cron Scheduler Verification:**
   - Execute `SELECT update_membership_statuses();` as role `postgres`. Confirm execution succeeds.
   - Inspect `cron.job_run_details` after the scheduled run at 00:00:00 UTC to confirm `status = 'succeeded'`.
3. **RPC Lockdown Verification:**
   - Attempt HTTP `POST /rest/v1/rpc/update_membership_statuses` using the `anon` key. Assert HTTP `401 Unauthorized` or `404 Not Found`.
   - Attempt HTTP `POST /rest/v1/rpc/get_admin_role` using the `anon` key. Assert HTTP `401 Unauthorized` or `404 Not Found`.
4. **Search Path Verification:**
   - Query `pg_proc WHERE proname IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')`.
   - Assert `proconfig = ARRAY['search_path=pg_catalog, pg_temp']` for all 5 routines.

---

## 6. Rollback Considerations

If any unexpected regression occurs upon applying the remediation migration:
1. **Single Routine Rollback:** Each routine can be restored to its prior state via `CREATE OR REPLACE FUNCTION` with `proconfig = NULL` and original grants restored.
2. **Trigger Safety Margin:** Because table definitions, columns, and trigger attachments are not dropped or recreated, zero trigger downtime or lock-exclusive table rewrites occur.
3. **Idempotency:** All `CREATE OR REPLACE` and `GRANT`/`REVOKE` statements are fully idempotent and transactional.

---

## 7. Audit Conclusion & Final Status

Every legacy routine on staging project `ymrblyiwohvxptiqjfsi` has been comprehensively inspected against the live PostgreSQL catalog, `cron.job` scheduler, `information_schema.routine_privileges`, `pg_trigger`, and application source repositories. Concrete risk assessments, execution mode requirements, grant boundaries, and a complete remediation migration specification have been established without performing any mutations on the staging or production databases.

`DB-5O AUDIT COMPLETE — REMEDIATION PLAN READY`
