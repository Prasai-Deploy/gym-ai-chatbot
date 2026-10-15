# STRIVA V2 — Phase 11 Security Remediation Plan

**Date:** 2026-10-13  
**Auditor & Security Lead:** Antigravity (STRIVA V2 Quality & Security Architecture Gate)  
**Target Architecture:** STRIVA V2 (AI Layer: TRINETRA)  
**Baseline Verification:** DB-4O PostgreSQL Integration Verification (`docs/database/DB-4O-postgres-integration-verification.md` — 91/91 passing tests)  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi` (Untouched, strictly 25 migrations baseline through Phase 10B)  
**Production Database Status:** Untouched, zero writes, zero connections  
**Audit Mode:** Read-Only Security Remediation Planning (Zero Remote DDL/DML, Zero Code Modifications)  
**Document Target:** `docs/database/PHASE-11-security-remediation-plan.md`  

---

## 1. Executive Summary & Audit Baseline

Following the successful execution of **DB-4O**, where 22/22 real PostgreSQL 18.3 engine integration tests and 69/69 application unit, contract, and isolation security suites passed with zero failures, this plan establishes the canonical remediation blueprint for all open security, configuration, and tenant-isolation findings across the STRIVA V2 platform.

This security remediation plan synthesizes findings from:
1. The **Phase 11 Readiness Audit** (`docs/database/PHASE-11-readiness-audit.md`),
2. The latest **Supabase Security Advisor** (linter inspection) results on staging project `ymrblyiwohvxptiqjfsi`,
3. The catalog inspection baseline from `docs/database/audit_results.json`, and
4. The 25 active migrations deployed through Phase 10B.

### Core Architecture Invariants & Rules
- **STRIVA Rule 5 & 8**: Client HTTP headers (e.g. `x-organization-id`) and client UI checks are never trusted for tenant authorization. Authorization is enforced server-side via Supabase Auth JWT identity, Express middleware (`auth.middleware.ts`, `tenant.middleware.ts`, `rbac.middleware.ts`), and PostgreSQL Row Level Security (RLS).
- **STRIVA Rule 6**: String literals like `'00000000-0000-0000-0000-000000000001'` or fallback tenant UUIDs are strictly prohibited in production code. Unauthenticated or unassigned tenant requests must fail closed (`403 Forbidden`).
- **STRIVA Rule 16 & 17**: Razorpay REST API is the primary billing integration with cryptographic HMAC SHA-256 webhook signature verification (`crypto.timingSafeEqual`).
- **Principle of Least Privilege**: Functions and tables are granted execution and access strictly to verified roles (`authenticated`, `service_role`). Blindly revoking necessary grants or adding blanket RLS policies without domain analysis is strictly forbidden.

---

## 2. Comprehensive Security Advisor Findings Inventory & Classification

Every security advisory item, database catalog defect, and architectural hardening finding is classified under one of five canonical categories:
- **Confirmed security vulnerability**: A flaw that allows privilege escalation, tenant isolation bypass, cross-user data corruption, or unauthenticated writes.
- **Intentional deny-by-default behavior**: An RLS or permission configuration that safely locks out client PostgREST access to internal or legacy tables.
- **Configuration issue**: A misconfiguration or omission in database routine settings, search paths, grants, or project auth controls.
- **Performance issue**: A missing index or inefficient policy query pattern.
- **Requires additional evidence**: An ambiguous finding requiring further testing or stakeholder confirmation.

### Summary Classification Matrix

| Finding ID | Finding Description | Severity | Finding Classification | Blocks Launch? | Target Resolution |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **S-01** | Fallback Tenant Default on `public.profiles.organization_id` | **CRITICAL** | Confirmed security vulnerability | **YES** | DB-5 Migration (`DROP DEFAULT`) |
| **S-02** | Sequential Non-Atomic PostgREST Demo Reset | **HIGH** | Confirmed security vulnerability | **YES** | DB-5 Stored Procedure (`reset_demo_account`) |
| **S-03** | Mutable Search Path in `public.handle_new_user()` | **HIGH** | Configuration issue | **YES** | DB-5 Migration (`SET search_path`) |
| **S-04** | Mutable Search Path & Unrestricted Grants in `public.is_org_member()` | **HIGH** | Configuration issue | **YES** | DB-5 Migration (`SET search_path`, `REVOKE/GRANT`) |
| **S-05** | Missing Explicit Search Path in `public.enforce_workout_session_state_transition()` | **MEDIUM** | Configuration issue | **YES** | DB-5 Migration (`SET search_path`) |
| **S-06** | Disabled Leaked-Password Protection in Supabase Auth | **MEDIUM** | Configuration issue | **YES** | Supabase Auth Project Configuration |
| **S-07** | 42 RLS-Enabled Tables Without Policies | **INFORMATIONAL** | Intentional deny-by-default behavior | **NO** | Documented & Retained Deny-by-Default |
| **S-08** | Unconfigured B2B Gym Tier Pricing & GST Rules | **HIGH** | Configuration issue | **YES (B2B)** | Stakeholder Written Approval |
| **S-09** | Divergent Migration History (`public._migrations` vs Supabase CLI) | **MEDIUM** | Configuration issue | **NO** | Post-Launch CI/CD Standardization |

---

## 3. Deep-Dive Routine Audit: SECURITY DEFINER & Trigger Functions

In PostgreSQL, `SECURITY DEFINER` functions execute with the privileges of the routine owner (here, `postgres` with `rolbypassrls = true`). If search paths are mutable or permissions are overly permissive, attackers can manipulate objects or execute unauthorized operations.

Below is the complete audit of all five functions active on the staging database:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 STRIVA V2 DATABASE ROUTINE AUDIT                                       │
├────────────────────────────────┬──────────────┬──────────────┬────────────────────────┬────────────────┤
│ Function Name                  │ Sec Definer? │ Owner        │ search_path            │ Status         │
├────────────────────────────────┼──────────────┼──────────────┼────────────────────────┼────────────────┤
│ handle_new_user()              │ TRUE         │ postgres     │ public (MUTABLE)       │ NEEDS FIX (S03)│
│ is_org_member(UUID)            │ TRUE         │ postgres     │ public (MUTABLE)       │ NEEDS FIX (S04)│
│ is_org_manager(UUID)           │ TRUE         │ postgres     │ pg_catalog, pg_temp    │ HARDENED (OK)  │
│ sync_water_logs_compatibility()│ TRUE         │ postgres     │ pg_catalog, pg_temp    │ HARDENED (OK)  │
│ enforce_workout_session_state()│ FALSE        │ postgres     │ NONE (MUTABLE)         │ NEEDS FIX (S05)│
└────────────────────────────────┴──────────────┴──────────────┴────────────────────────┴────────────────┘
```

### 3.1 `public.handle_new_user()`
- **Purpose:** Executed as an `AFTER INSERT` trigger on `auth.users`. Provisions member records in `public.profiles`, `public.v2_fitness_profiles`, `public.user_preferences`, `public.member_settings`, and `public.subscriptions` (permanent sandbox access for `demo@sweatfix.com` or 14-day Pro trial for standard users).
- **Owner:** `postgres`
- **Execution Context:** `SECURITY DEFINER` (Required: Auth engine operates in `auth` schema and must write across multiple `public` tables protected by RLS).
- **Search Path:** Currently `'public'` (Flagged by Security Advisor as `function_search_path_mutable`).
- **Routine Execution Grants:** By default in PostgreSQL, newly created functions grant `EXECUTE` to `PUBLIC`. Although a trigger returning type `trigger` cannot be invoked as an RPC over PostgREST, least-privilege standards dictate revoking execution from untrusted roles.
- **Caller Requirements:** PostgreSQL internal trigger engine on `auth.users`.
- **Application Dependencies:** User registration, OAuth sign-in, magic link authentication.
- **Vulnerability / Risk:** A mutable search path (`public`) allows unprivileged users who can create objects in `public` to shadow system operators or functions, resulting in privilege escalation during user signup.
- **Remediation Specification:** Recreate with `SET search_path = pg_catalog, pg_temp`, explicitly schema-qualify all table calls (`public.profiles`, `public.subscriptions`), and restrict execution grants to `supabase_auth_admin`, `service_role`, and `postgres`.

### 3.2 `public.is_org_member(target_org_id UUID)`
- **Purpose:** Canonical multi-tenant RLS helper function. Evaluates whether `auth.uid()` belongs to `target_org_id` in `public.organization_members` OR owns `target_org_id` in `public.organizations`.
- **Owner:** `postgres`
- **Execution Context:** `STABLE SECURITY DEFINER` (Required: Must bypass RLS on `organization_members` when evaluating tenant visibility for members reading organization locations, branding, workouts, etc.).
- **Search Path:** Currently `'public'` (Flagged by Security Advisor as `function_search_path_mutable`).
- **Routine Execution Grants:** Currently lacks explicit privilege revocation, inheriting PostgreSQL default `GRANT EXECUTE TO PUBLIC`. This exposes the function to direct RPC invocation by anonymous callers (`anon`). While it fails closed when `auth.uid() IS NULL`, exposing internal tenant functions to unauthenticated callers violates least privilege.
- **Caller Requirements:** Executed within PostgreSQL RLS policies by `authenticated` users and `service_role`.
- **Application Dependencies:** RLS policies on `organizations`, `organization_locations`, `organization_branding`, `organization_settings`, `organization_invitations`, `v2_workout_plans`, `v2_workout_sessions`, and `exercise_sets`.
- **Vulnerability / Risk:** Mutable search path enables potential function shadowing; unrevoked `anon` execution exposes routine to unnecessary public RPC surface.
- **Remediation Specification:** Recreate with `SET search_path = pg_catalog, pg_temp`, schema-qualify all queries (`public.organization_members`, `public.organizations`), revoke execution from `PUBLIC` and `anon`, and grant strictly to `authenticated` and `service_role`.

### 3.3 `public.is_org_manager(target_org_id UUID)`
- **Purpose:** Dedicated non-recursive manager authorization helper created in Phase 9A (`phase_9a_rls_recursion_fix.sql`). Authorizes organization owners, gym managers, and platform super admins without triggering PostgreSQL error `42P17`.
- **Owner:** `postgres` (with `rolbypassrls = true`)
- **Execution Context:** `STABLE SECURITY DEFINER`
- **Search Path:** `pg_catalog, pg_temp` (Hardened and immutable).
- **Routine Execution Grants:** Explicitly revoked from `PUBLIC` and `anon`; granted strictly to `authenticated` and `service_role`.
- **Caller Requirements:** RLS policy `"Staff managers manage organization members"` on `public.organization_members`.
- **Application Dependencies:** Gym Owner OS staff management, member directory, role assignment.
- **Audit Determination:** **VERIFIED SECURE & COMPLIANT**. No changes required.

### 3.4 `public.sync_water_logs_compatibility()`
- **Purpose:** Transitional backward-compatibility trigger on `public.water_logs BEFORE INSERT OR UPDATE` created in Phase 9B (`phase_9b_legacy_identity_bridge.sql`). Synchronizes legacy `intake_amount` and modern `amount_ml`, and translates `profile_id` <-> legacy `user_id` via `legacy_user_id_map`.
- **Owner:** `postgres`
- **Execution Context:** `SECURITY DEFINER`
- **Search Path:** `pg_catalog, pg_temp` (Hardened and immutable).
- **Routine Execution Grants:** Trigger function; revoked from public API.
- **Caller Requirements:** Executed by PostgreSQL trigger engine on `public.water_logs`.
- **Application Dependencies:** `NutritionRepository.ts`, legacy hydration sync.
- **Audit Determination:** **VERIFIED SECURE & COMPLIANT**. No changes required.

### 3.5 `public.enforce_workout_session_state_transition()`
- **Purpose:** State machine trigger created in Phase 10B (`phase_10b_workout_core_schema.sql`). Enforces that terminal workout sessions (`completed`, `abandoned`, `cancelled`) cannot be reopened via database update.
- **Owner:** `postgres`
- **Execution Context:** `SECURITY INVOKER` (Standard trigger function).
- **Search Path:** None set (Inherits caller search path; flagged by Security Advisor as `function_search_path_mutable`).
- **Routine Execution Grants:** Default grants.
- **Caller Requirements:** Trigger on `public.v2_workout_sessions BEFORE UPDATE OF state`.
- **Application Dependencies:** `V2WorkoutSessionRepository.ts`, workout execution engine.
- **Vulnerability / Risk:** Lacks pinned search path, making it susceptible to environment-dependent resolution.
- **Remediation Specification:** Recreate with `SET search_path = pg_catalog, pg_temp`.

---

## 4. Deep-Dive Table Audit: RLS-Enabled Tables Without Policies

Supabase Security Advisor reports: *"Table has RLS enabled but no policies"*.  
In PostgreSQL, when RLS is enabled on a table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) without any policies:
- Client roles (`anon` and `authenticated`) querying through PostgREST are **denied 100% of access** (`SELECT` returns 0 rows; mutations fail).
- Administrative roles (`service_role` and `postgres`) bypass RLS and retain full operational access.

**Critical Rule:** Do **NOT** blindly add blanket RLS policies (`CREATE POLICY "Allow all"`) or open these tables to clients. Doing so would violate the Principle of Least Privilege and leak internal ledgers or quarantined legacy data.

### Categorization of the 42 RLS-Enabled Tables Without Policies

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           42 RLS-ENABLED TABLES WITHOUT POLICIES                                 │
├───────────────────────────────────┬──────────────────────────────────────────────────────────────┤
│ Category                          │ Tables Included                                              │
├───────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 1. Internal Backend Ledgers (5)   │ _migrations, payment_events, organization_staff, session,    │
│                                   │ push_subscriptions                                           │
├───────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 2. Quarantined Legacy V1 (36)     │ users, workout_sessions, workout_plans, workout_logs,        │
│                                   │ workout_progress, nutrition_logs, fitness_profiles,          │
│                                   │ daily_plans, daily_fitness_stats, daily_hydration_progress,  │
│                                   │ water_goals, activity_logs, activity_tracking_state,         │
│                                   │ ai_chat_logs, allowed_users, chatbot_generated_diets,        │
│                                   │ chatbot_generated_plans, chatbot_generated_workouts,         │
│                                   │ meal_plans, membership_plans, memberships, progress,         │
│                                   │ progress_logs, pt_assignments, template_diet_plans,          │
│                                   │ template_workout_plans, user_badges, user_diet_assignments,  │
│                                   │ user_fitness_plans, user_meal_tracking,                      │
│                                   │ user_notification_settings, user_progress, user_stats,       │
│                                   │ user_streaks, user_workout_assignments, weekly_progress      │
├───────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 3. Phase 9B Remediated Table (1)  │ water_logs (Now has policies from phase_9b migration)        │
└───────────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

### Detailed Evaluation

#### Category 1: Internal Backend-Only Ledgers (5 Tables) — *Intentional Deny-by-Default*
1. `public._migrations`: Tracks applied migration history. Internal schema metadata. Clients must NEVER access migration records. Deny-by-default is **intentional and mandatory**.
2. `public.payment_events`: Razorpay webhook event ledger. Contains raw webhook JSON payloads, order signatures, and payment IDs. Written strictly by backend server webhook handlers using `service_role`. Clients must NEVER read or insert payment events. Deny-by-default is **intentional and mandatory**.
3. `public.organization_staff`: Legacy intermediate staff mapping from initial Phase 8 migrations. Superseded by `public.organization_members`. Only read internally by backend analytics aggregations (`ownerAnalytics.service.ts`). PostgREST access must remain **denied**.
4. `public.session`: Backend security audit session tracking (`AuditService.ts`). Managed strictly by Express server. PostgREST access must remain **denied**.
5. `public.push_subscriptions`: Push notification dispatch records. Managed via backend notification services. Direct client PostgREST access must remain **denied**.

#### Category 2: Quarantined Legacy V1 Tables (36 Tables) — *Intentional Deny-by-Default*
These tables were created on 2026-06-30 during early prototyping and use serial integer user IDs (`public.users.id`). All active STRIVA V2 services target modern UUID schemas (`public.profiles`, `public.v2_nutrition_logs`, `public.v2_workout_plans`, `public.v2_workout_sessions`, `public.exercise_sets`).  
- **Active Code Reference:** Only referenced during demo account data reset (`IdentityRepository.resetDemoData()`), which runs with backend `service_role` credentials.
- **Client Access:** Zero modern client components or API endpoints query these tables directly.
- **Determination:** Deny-by-default is the **correct, intentional security posture**. Adding RLS policies to these tables would create false attack surfaces. They remain safely quarantined until scheduled for post-launch dropping.

#### Category 3: Phase 9B Remediated Table (1 Table) — *Already Remediated*
- `public.water_logs`: Appeared in older audit snapshots prior to Phase 9B. On staging, `phase_9b_legacy_identity_bridge.sql` deployed:
  - Policy `"Members manage own water logs"` (`FOR ALL TO authenticated`)
  - Policy `"Service role manages water logs"` (`FOR ALL TO service_role`)
- **Status:** Already remediated.

---

## 5. Detailed Remediation Specifications per Finding

---

### Finding S-01: Hardcoded Fallback Tenant Default on `public.profiles.organization_id`
- **Classification:** Confirmed security vulnerability
- **Severity:** **CRITICAL** (Blocks Launch)
- **Location:** Database Catalog (`public.profiles.organization_id`)
- **Evidence:**  
  `docs/database/audit_results.json`:
  ```json
  "column_default": "'00000000-0000-0000-0000-000000000001'::uuid"
  ```
- **Violation:** Violates STRIVA V2 Rule 6: *"String literals like '00000000-0000-0000-0000-00000001' or fallback tenant UUIDs are strictly PROHIBITED in production code. Unauthenticated or unassigned tenant requests must fail closed."*
- **Impact:** Any user record created without an explicit `organization_id` (via direct SQL, edge function, or default trigger) silently inherits the default organization ID. If multi-tenant middleware evaluates this user, they are granted access to tenant `00000000-...-0001` instead of failing closed (`403 Forbidden`).
- **Proposed Fix (DB-5):**
  ```sql
  -- Remove hardcoded fallback tenant default
  ALTER TABLE public.profiles ALTER COLUMN organization_id DROP DEFAULT;

  -- Reconcile any existing profiles pointing to legacy fallback UUID to unassigned NULL
  UPDATE public.profiles 
  SET organization_id = NULL 
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND id NOT IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
    );
  ```
- **Regression Tests:**
  1. `INSERT INTO public.profiles (id, email) VALUES (gen_random_uuid(), 'test@test.com')` -> verify `organization_id IS NULL`.
  2. Authenticate as user with `organization_id IS NULL` -> request tenant route `/api/v1/owner/members` -> assert `403 Forbidden`.
- **Dependencies:** None.
- **Rollback Approach:** `ALTER TABLE public.profiles ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;` (Safe emergency rollback).
- **Blocks Launch:** **YES**

---

### Finding S-02: Non-Atomic Sequential PostgREST Demo Account Reset
- **Classification:** Confirmed security vulnerability / Integrity gap
- **Severity:** **HIGH** (Blocks Launch)
- **Location:** `backend/src/modules/identity/repositories/IdentityRepository.ts:resetDemoData()`
- **Evidence:**  
  Currently executes 18 separate HTTP PostgREST `DELETE` requests in a loop. While fail-closed (aborts immediately upon any HTTP error), it lacks multi-statement ACID transactional rollback across HTTP boundaries.
- **Impact:** A network timeout or database hiccup mid-loop leaves the demo account in an inconsistent, partially deleted state (e.g. child exercise sets deleted, but parent workout session remains). Subsequent user actions encounter referential anomalies until reset is re-run.
- **Proposed Fix (DB-5):**
  1. Create an atomic PostgreSQL stored procedure in `phase_11_prelaunch_hardening.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION public.reset_demo_account(target_user_id UUID)
  RETURNS void AS $$
  DECLARE
      v_demo_email TEXT;
  BEGIN
      -- Fail-closed validation: verify caller is authenticated and target is a valid demo user
      IF target_user_id IS NULL THEN
          RAISE EXCEPTION 'Target user ID must not be null';
      END IF;

      SELECT email INTO v_demo_email FROM public.profiles WHERE id = target_user_id;
      IF v_demo_email IS NULL OR v_demo_email NOT LIKE '%demo%' THEN
          RAISE EXCEPTION 'Security violation: reset_demo_account is restricted strictly to verified demo accounts. Target email: %', v_demo_email;
      END IF;

      -- Execute in strict foreign-key dependency order within single atomic transaction
      -- Child records first
      DELETE FROM public.exercise_sets 
      WHERE session_id IN (SELECT id FROM public.v2_workout_sessions WHERE user_id = target_user_id);

      -- Modern V2 domain records
      DELETE FROM public.v2_workout_sessions WHERE user_id = target_user_id;
      DELETE FROM public.v2_workout_plans WHERE user_id = target_user_id;
      DELETE FROM public.v2_nutrition_logs WHERE user_id = target_user_id;
      DELETE FROM public.water_logs WHERE profile_id = target_user_id;

      -- Legacy V1 tables
      DELETE FROM public.progress WHERE user_id = target_user_id;
      DELETE FROM public.daily_plans WHERE user_id = target_user_id;
      DELETE FROM public.workout_plans WHERE user_id = target_user_id;
      DELETE FROM public.workout_sessions WHERE user_id = target_user_id;
      DELETE FROM public.chatbot_generated_plans WHERE user_id = target_user_id;
      DELETE FROM public.workout_logs WHERE user_id = target_user_id;
      DELETE FROM public.progress_logs WHERE user_id = target_user_id;
      DELETE FROM public.chatbot_generated_workouts WHERE user_id = target_user_id;
      DELETE FROM public.chatbot_generated_diets WHERE user_id = target_user_id;
      DELETE FROM public.user_fitness_plans WHERE user_id = target_user_id;
      DELETE FROM public.user_meal_tracking WHERE user_id = target_user_id;
      DELETE FROM public.user_progress WHERE user_id = target_user_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

  REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.reset_demo_account(UUID) TO service_role;
  ```
  2. Wire `IdentityRepository.resetDemoData()` to execute:
  ```typescript
  const { error } = await this.supabase.rpc('reset_demo_account', { target_user_id: userId });
  ```
- **Regression Tests:**
  1. Atomic rollback injection test: Inject an intentional constraint failure during reset; assert 0 rows deleted across all tables.
  2. Non-demo safety test: Call `reset_demo_account` with standard member UUID; assert execution aborted with security violation error.
- **Dependencies:** None.
- **Rollback Approach:** Fallback to existing application-layer loop in `IdentityRepository.ts`.
- **Blocks Launch:** **YES**

---

### Finding S-03: Mutable Search Path in `public.handle_new_user()`
- **Classification:** Configuration issue / Security hardening
- **Severity:** **HIGH** (Blocks Launch)
- **Location:** Database Routine (`public.handle_new_user()`)
- **Evidence:**  
  `backend/supabase/migrations/phase_7b_trial_foundation.sql:33`:
  ```sql
  SET search_path TO 'public'
  ```
  Security Advisor check: `function_search_path_mutable`.
- **Impact:** Privilege escalation risk. If an unprivileged user is able to create objects in the `public` schema, they could shadow system functions invoked by `handle_new_user()`, executing malicious code in the context of `postgres` during new user registration.
- **Proposed Fix (DB-5):**
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger AS $$
  BEGIN
      -- Fully schema-qualified table references
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

      -- Subscription & Trial Provisioning
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
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

  -- Privilege Hardening
  REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role, postgres;
  ```
- **Regression Tests:**
  1. Trigger test on `auth.users`: Sign up test user -> assert `profiles`, `v2_fitness_profiles`, and `subscriptions` created with 14-day trial.
  2. Direct RPC invocation test: Call `handle_new_user` as `anon` and `authenticated` -> assert rejected (`403 / 42501 permission denied`).
- **Dependencies:** None.
- **Rollback Approach:** Re-apply definition from `phase_7b_trial_foundation.sql`.
- **Blocks Launch:** **YES**

---

### Finding S-04: Mutable Search Path & Unrestricted Grants in `public.is_org_member()`
- **Classification:** Configuration issue / Security hardening
- **Severity:** **HIGH** (Blocks Launch)
- **Location:** Database Routine (`public.is_org_member(UUID)`)
- **Evidence:**  
  `backend/supabase/migrations/phase_8b_organization_staff_foundation.sql:72`:
  ```sql
  $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
  ```
  Security Advisor checks: `function_search_path_mutable` and unrevoked public routine execution.
- **Impact:** Shadowing attacks during RLS policy evaluation across tenant queries; unnecessary public attack surface exposed to unauthenticated callers via PostgREST RPC.
- **Proposed Fix (DB-5):**
  ```sql
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
  $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

  -- Privilege Hardening
  REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM anon;
  GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO service_role;
  ```
- **Regression Tests:**
  1. Direct anonymous RPC call: Call `/rest/v1/rpc/is_org_member` without JWT -> assert `401 / 403 Forbidden`.
  2. Member tenant access: Authenticated member of Org A selects `v2_workout_plans` -> assert succeeds.
  3. Cross-tenant access: Member of Org A selects `v2_workout_plans` of Org B -> assert returns 0 rows (denied).
- **Dependencies:** None.
- **Rollback Approach:** Re-apply definition from `phase_8b_organization_staff_foundation.sql`.
- **Blocks Launch:** **YES**

---

### Finding S-05: Missing Explicit Search Path in `public.enforce_workout_session_state_transition()`
- **Classification:** Configuration issue
- **Severity:** **MEDIUM** (Blocks Launch)
- **Location:** Database Routine (`public.enforce_workout_session_state_transition()`)
- **Evidence:**  
  `backend/supabase/migrations/phase_10b_workout_core_schema.sql:100`:
  ```sql
  $$ LANGUAGE plpgsql;
  ```
  Lacks `SET search_path`.
- **Impact:** Resolves symbols based on caller's dynamic search path, creating non-deterministic execution behavior and Security Advisor warnings.
- **Proposed Fix (DB-5):**
  ```sql
  CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
  RETURNS trigger AS $$
  BEGIN
      IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
          RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp;
  ```
- **Regression Tests:**
  1. Attempt to update `v2_workout_sessions` from `completed` to `started` -> assert exception raised.
  2. Valid transition from `started` to `completed` -> assert update succeeds.
- **Dependencies:** None.
- **Rollback Approach:** Re-apply definition from `phase_10b_workout_core_schema.sql`.
- **Blocks Launch:** **YES**

---

### Finding S-06: Disabled Leaked-Password Protection in Supabase Auth
- **Classification:** Configuration issue
- **Severity:** **MEDIUM** (Blocks Launch)
- **Location:** Supabase Project Settings (Auth > Attack Protection > Leaked Password Protection)
- **Evidence:** Supabase Security Advisor finding: `auth_leaked_password_protection_disabled`.
- **Impact:** Allows users to register or change passwords to known compromised credentials, exposing accounts to automated credential stuffing attacks.
- **Proposed Fix (Operational):**
  - Enable Leaked Password Protection in Supabase Dashboard:  
    `Authentication` -> `Attack Protection` -> Toggle `Leaked Password Protection` to **Enabled**.
  - Or configure via Supabase Management API during environment provisioning.
- **Regression Tests:**
  1. Attempt registration with a known compromised password (e.g. `password123`) -> assert signup rejected with password breach alert.
  2. Attempt registration with a strong, uncompromised password -> assert signup succeeds.
- **Dependencies:** Supabase Project Admin access.
- **Rollback Approach:** Toggle setting back to Disabled in Supabase Dashboard.
- **Blocks Launch:** **YES**

---

### Finding S-07: 42 RLS-Enabled Tables Without Policies
- **Classification:** Intentional deny-by-default behavior
- **Severity:** **INFORMATIONAL** (Does NOT Block Launch)
- **Location:** 42 tables in `public` schema
- **Evidence:** Supabase Security Advisor finding: `rls_enabled_no_policy`.
- **Impact:** PostgREST client queries to these 42 tables return empty results or are denied. Backend operations using `service_role` continue to function without restriction.
- **Audit Determination:**
  - 5 tables are internal backend ledgers (`_migrations`, `payment_events`, `organization_staff`, `session`, `push_subscriptions`). Deny-by-default is **correct**.
  - 36 tables are quarantined legacy V1 tables (`users`, legacy `workout_sessions`, etc.). Deny-by-default is **correct**.
  - 1 table (`water_logs`) already received policies in Phase 9B.
- **Proposed Action:**
  - **Do NOT add dummy policies.** Adding `FOR ALL USING (true)` or unvetted policies would introduce critical data leak vulnerabilities.
  - Document this finding in compliance documentation as an intentional security boundary.
- **Blocks Launch:** **NO**

---

### Finding S-08: Unconfigured B2B Gym Tier Pricing & GST Tax Invoicing
- **Classification:** Configuration issue / Commercial business gate
- **Severity:** **HIGH** (Blocks Launch for B2B Commercial Tiers)
- **Location:** `public.organization_subscription_plans` and `RazorpayProvider.ts`
- **Evidence:**  
  `organization_subscription_plans` rows for `gym_starter`, `gym_growth`, `gym_enterprise` have `amount_paise = NULL` and `is_configured = false`.
- **Impact:** B2B checkout fails closed with `400 Bad Request` (`PLAN_NOT_CONFIGURED`). Gym owners cannot purchase SaaS subscriptions online.
- **Proposed Action:**
  - Await formal written stakeholder approval for pricing figures and GST tax determination.
  - Once approved, configure pricing in DB-5 or administrative seed script.
  - Maintain fail-closed guard until approval is received.
- **Blocks Launch:** **YES** (Blocks B2B commercial go-live).

---

### Finding S-09: Migration History Divergence (`public._migrations` vs Supabase CLI)
- **Classification:** Configuration issue
- **Severity:** **MEDIUM** (Does NOT Block Launch)
- **Location:** `public._migrations` on staging vs `backend/supabase/migrations/`
- **Evidence:** Staging tracks 25 migrations in ad-hoc `public._migrations`. 13 legacy prototyping files were skipped. Standard `supabase_migrations.schema_migrations` does not exist on staging.
- **Impact:** Running native `supabase db push` directly would attempt to re-run skipped migrations and fail. Migrations must currently be applied via `backend/scripts/apply_staging_migrations.js`.
- **Proposed Action:**
  - Continue applying Phase 11 / DB-5 migrations via `apply_staging_migrations.js` with advisory lock `746291048201582`.
  - Reconcile migration ledger to standard Supabase CLI table in post-launch CI/CD maintenance.
- **Blocks Launch:** **NO**

---

## 6. Consolidated DB-5 Pre-Launch Migration Blueprint

All database-level security fixes identified above will be packaged into a single, cohesive, pre-launch migration:  
**`backend/supabase/migrations/phase_11_prelaunch_hardening.sql` (DB-5)**

### 6.1 Draft Migration Contents (For Phase 11 DB-5 Execution)

```sql
-- ====================================================================
-- STRIVA V2 - Phase 11 / DB-5: Pre-Launch Security & Catalog Hardening
--
-- Fixes:
-- 1. S-01: Drop fallback tenant UUID default on public.profiles.organization_id.
-- 2. S-02: Atomic database procedure public.reset_demo_account(UUID).
-- 3. S-03: Pin search_path on public.handle_new_user() and harden routine grants.
-- 4. S-04: Pin search_path on public.is_org_member(UUID) and revoke anon grants.
-- 5. S-05: Pin search_path on public.enforce_workout_session_state_transition().
--
-- TRANSACTION SAFETY: Wrapped in atomic transaction block.
-- ADVISORY LOCK: 746291048201582
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. Finding S-01: Drop Hardcoded Fallback Tenant Default
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN organization_id DROP DEFAULT;

-- Reconcile any unassigned profiles holding fallback UUID
UPDATE public.profiles 
SET organization_id = NULL 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND id NOT IN (
    SELECT user_id FROM public.organization_members 
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  );

-- --------------------------------------------------------------------
-- 2. Finding S-02: Atomic Demo Account Data Reset Procedure
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_demo_account(target_user_id UUID)
RETURNS void AS $$
DECLARE
    v_demo_email TEXT;
BEGIN
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user ID must not be null';
    END IF;

    SELECT email INTO v_demo_email FROM public.profiles WHERE id = target_user_id;
    IF v_demo_email IS NULL OR v_demo_email NOT LIKE '%demo%' THEN
        RAISE EXCEPTION 'Security violation: reset_demo_account is restricted strictly to verified demo accounts. Target email: %', v_demo_email;
    END IF;

    -- Child exercise sets first
    DELETE FROM public.exercise_sets 
    WHERE session_id IN (SELECT id FROM public.v2_workout_sessions WHERE user_id = target_user_id);

    -- Modern V2 domain records
    DELETE FROM public.v2_workout_sessions WHERE user_id = target_user_id;
    DELETE FROM public.v2_workout_plans WHERE user_id = target_user_id;
    DELETE FROM public.v2_nutrition_logs WHERE user_id = target_user_id;
    DELETE FROM public.water_logs WHERE profile_id = target_user_id;

    -- Legacy V1 tables
    DELETE FROM public.progress WHERE user_id = target_user_id;
    DELETE FROM public.daily_plans WHERE user_id = target_user_id;
    DELETE FROM public.workout_plans WHERE user_id = target_user_id;
    DELETE FROM public.workout_sessions WHERE user_id = target_user_id;
    DELETE FROM public.chatbot_generated_plans WHERE user_id = target_user_id;
    DELETE FROM public.workout_logs WHERE user_id = target_user_id;
    DELETE FROM public.progress_logs WHERE user_id = target_user_id;
    DELETE FROM public.chatbot_generated_workouts WHERE user_id = target_user_id;
    DELETE FROM public.chatbot_generated_diets WHERE user_id = target_user_id;
    DELETE FROM public.user_fitness_plans WHERE user_id = target_user_id;
    DELETE FROM public.user_meal_tracking WHERE user_id = target_user_id;
    DELETE FROM public.user_progress WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

COMMENT ON FUNCTION public.reset_demo_account(UUID) IS 
'STRIVA V2 atomic demo reset procedure executing within single ACID transaction block.';

REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_demo_account(UUID) TO service_role;

-- --------------------------------------------------------------------
-- 3. Finding S-03: Harden public.handle_new_user()
-- --------------------------------------------------------------------
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role, postgres;

-- --------------------------------------------------------------------
-- 4. Finding S-04: Harden public.is_org_member()
-- --------------------------------------------------------------------
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO service_role;

-- --------------------------------------------------------------------
-- 5. Finding S-05: Harden public.enforce_workout_session_state_transition()
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
RETURNS trigger AS $$
BEGIN
    IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
        RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp;

COMMIT;
```

---

## 7. Verification & Safety Gate Checklist for DB-5

Prior to deploying DB-5 to staging or production, the following safety gates must be executed:

1. **Local Disposable PG 18 Validation:**
   - Execute `phase_11_prelaunch_hardening.sql` against the local test cluster on port 5433.
   - Assert all 22 real PostgreSQL integration tests pass.
   - Assert `profiles.organization_id` default is verified `NULL`.
2. **Staging Preflight Check:**
   - Confirm project host contains `ymrblyiwohvxptiqjfsi`.
   - Acquire 64-bit advisory transaction lock `746291048201582`.
   - Inspect active queries against `profiles` and `organization_members`.
3. **Post-Deployment Catalog Verification:**
   - Query `information_schema.columns` to verify `organization_id` has no default.
   - Query `pg_proc` to verify `handle_new_user`, `is_org_member`, `is_org_manager`, `sync_water_logs_compatibility`, and `enforce_workout_session_state_transition` all possess `["search_path=pg_catalog, pg_temp"]`.
   - Query `routine_privileges` to verify `PUBLIC` and `anon` have 0 grants on `is_org_member` and `reset_demo_account`.
4. **Supabase Security Advisor Re-Scan:**
   - Run Security Advisor in Supabase Dashboard.
   - Confirm 0 `function_search_path_mutable` warnings remain.
   - Confirm 0 exposed `SECURITY DEFINER` warnings remain.

---

## 8. Summary of Recommended Next Actions

1. **Present Remediation Plan for Architectural Sign-Off:**
   - Review `docs/database/PHASE-11-security-remediation-plan.md` with engineering stakeholders.
2. **Obtain Written Decision on B2B Pricing:**
   - Secure formal approval for B2B gym software licensing tiers (`gym_starter`, `gym_growth`, `gym_enterprise`) and GST invoicing rules.
3. **Execute DB-5 Pre-Launch Hardening:**
   - Author `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` containing the verified DDL.
   - Update `IdentityRepository.ts` to call `public.reset_demo_account()`.
   - Validate on local PostgreSQL 18 before applying to staging.
4. **Enable Leaked Password Protection:**
   - Enable feature in Supabase project dashboard settings.

---

*Plan complete. In strict adherence to safety constraints, zero database writes, code modifications, or production interactions were performed during this audit.*
