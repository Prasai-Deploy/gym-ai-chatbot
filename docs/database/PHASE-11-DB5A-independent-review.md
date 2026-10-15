# STRIVA V2 — Phase 11 / DB-5A: Independent Migration Safety Review

**Document Version:** 1.0.0  
**Target Database / Staging Ref:** `ymrblyiwohvxptiqjfsi`  
**Current Migration Baseline:** 25 migrations (through Phase 10B)  
**Execution Mode:** Read-only inspection & local disposable-database verification (PostgreSQL 18.3)  
**Status:** COMPLETE  

---

## 1. Executive Verdict: CONDITIONAL PASS

The draft migration `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` and its supporting implementation and rollback plans have undergone an independent, evidence-based architectural and security review.

### Verdict Summary
- **Technical Architecture & Guardrails:** **PASS**  
  The migration enforces advisory transaction lock `746291048201582`, schema-qualifies all relations, pins `search_path = pg_catalog, pg_temp` across all hardened routines, revokes public execution privileges, and drops the insecure fallback tenant default without breaking consumer fitness routes.
- **Trigger & Context Compatibility:** **PASS**  
  The user signup trigger `handle_new_user()` was verified under `supabase_auth_admin` execution context, provisioning unassigned consumer profiles (`organization_id = NULL`) and initial 14-day Pro trial subscriptions.
- **Blocker Finding:** **CONDITIONAL**  
  An independent vulnerability analysis of `reset_demo_account()` uncovered a **CRITICAL** vulnerability (Finding DB5A-01): the database routine uses a loose substring check (`v_demo_email NOT LIKE '%demo%'`), which permits resetting and deleting activity for arbitrary legitimate users whose email addresses contain the substring "demo" (e.g., `demosthenes@gmail.com`). 

**Condition for Staging Deployment:**  
The draft migration must be updated to enforce strict email equality (`LOWER(v_demo_email) <> 'demo@sweatfix.com'`) before deployment to staging `ymrblyiwohvxptiqjfsi`. Staging baseline remains untouched at 25.

---

## 2. Findings Classification & Audit Matrix

| Finding ID | Severity | Category | Target / Artifact | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DB5A-01** | **CRITICAL** | Authorization / Data Loss | `reset_demo_account()` in `phase_11_prelaunch_hardening.sql:66` | **Pre-Staging Fix Required** |
| **DB5A-02** | **HIGH** | Multi-Tenancy | `profiles.organization_id` conversion in `phase_11_prelaunch_hardening.sql:35` | **Verified Safe** (5 profiles affected) |
| **DB5A-03** | **MEDIUM** | Documentation / Catalog | Policy reconciliation (41 vs 42 tables without policies) | **Reconciled & Documented** |
| **DB5A-04** | **LOW** | Idempotency | Advisory lock & DDL re-run safety | **Verified Idempotent** |

---

## 3. Evidence & Detailed Findings

### 3.1. Finding DB5A-01 [CRITICAL]: Loose Demo Email Substring Matching in `reset_demo_account()`

#### Code Reference
- Target File: [`phase_11_prelaunch_hardening.sql:64-70`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_11_prelaunch_hardening.sql#L64-L70)
```sql
SELECT email INTO v_demo_email FROM public.profiles WHERE id = target_user_id;

IF v_demo_email IS NULL THEN
    RAISE EXCEPTION 'Target user does not exist: %', target_user_id;
END IF;

-- VULNERABLE CONDITION:
IF v_demo_email <> 'demo@sweatfix.com' AND v_demo_email NOT LIKE '%demo%' THEN
    RAISE EXCEPTION 'Security violation: reset_demo_account is restricted to demo accounts. Target email: %', v_demo_email;
END IF;
```

#### Vulnerability Analysis
1. **Discrepancy with Application Security Layer:**  
   In [`backend/src/modules/identity/controllers/IdentityController.ts:140-147`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/identity/controllers/IdentityController.ts#L140-L147), the backend strictly permits demo reset exclusively for `demo@sweatfix.com`:
   ```typescript
   const email = (req as any).user?.email;
   if (email !== 'demo@sweatfix.com') {
     logger.warn({ userId, email }, '[IdentityController] Unauthorized demo reset attempt rejected');
     return res.status(403).json({ error: 'Forbidden: Demo reset is only permitted for the demo account' });
   }
   ```
2. **Database Exploitability:**  
   If an internal caller or privileged script invokes `supabaseAdmin.rpc('reset_demo_account', { target_user_id: '<UUID>' })` for any legitimate account whose email contains "demo" (e.g. `demosthenes@gmail.com`, `academic.democracy@oxford.edu`, `john.demopoulos@example.com`), the database function will treat that user as a demo account and permanently wipe all their workout sessions, sets, nutrition logs, water logs, and legacy history!
3. **Empirical Verification on Live PostgreSQL 18.3:**  
   During local test execution (Test T-06), seeding a user with email `demosthenes@gmail.com` and invoking `reset_demo_account()` triggered this exact vulnerability:
   ```
   WARNING: CRITICAL SECURITY FINDING: reset_demo_account allowed reset of demosthenes@gmail.com due to loose LIKE %demo% filter!
   ```

#### Required Fix
Replace lines 66–68 in `phase_11_prelaunch_hardening.sql` with strict equality:
```sql
IF LOWER(v_demo_email) <> 'demo@sweatfix.com' THEN
    RAISE EXCEPTION 'Security violation: reset_demo_account is restricted strictly to verified demo accounts (demo@sweatfix.com). Target email: %', v_demo_email;
END IF;
```

---

### 3.2. Finding DB5A-02 [HIGH]: Tenant Isolation & Default Conversion Impact

#### Evidence from Staging Catalog
- Inspection Source: [`docs/database/audit_results.json`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/audit_results.json)
- Total rows in `public.organizations`: **1**
  - ID: `00000000-0000-0000-0000-000000000001`
  - Slug: `default-org` (seeded as dummy tenant in `008_multi_tenant_saas_foundation.sql`)
- Total rows in `public.organization_members`: **0**
- Total profiles in `public.profiles`: **5**
  - Profile IDs affected:
    1. `a1bf8b11-e2c7-4f7f-9d36-5af53418e20b` (`user1@example.com`)
    2. `b96c0b60-fb31-4835-be02-eaefd85c1815` (`user2@example.com`)
    3. `2dbbad1d-6b58-403d-bc87-d4fae7587efd` (`owner@example.com`)
    4. `2d27bc46-5ec9-4089-a292-80eaae700aa6` (`member@example.com`)
    5. `e17245f8-745a-4cb7-a5ec-08e068f3eb74` (`demo@sweatfix.com`)

#### Impact Analysis
1. All 5 existing profiles currently have `organization_id = '00000000-0000-0000-0000-000000000001'` because column creation assigned that fallback default.
2. Because `organization_members` contains **0 rows**, no legitimate tenant membership exists for that UUID.
3. Executing:
   ```sql
   ALTER TABLE public.profiles ALTER COLUMN organization_id DROP DEFAULT;
   UPDATE public.profiles 
   SET organization_id = NULL 
   WHERE organization_id = '00000000-0000-0000-0000-000000000001';
   ```
   affects exactly 5 rows, setting them to `NULL`.
4. Tenant middleware (`backend/src/middleware/tenant.middleware.ts`) and RBAC middleware (`backend/src/middleware/rbac.middleware.ts`) verify that unassigned profiles (`organization_id = NULL`):
   - Are denied access to tenant-scoped gym owner/trainer routes (`403 Forbidden`).
   - Retain full, uninterrupted access to consumer routes (`/api/v1/workouts`, `/api/v1/nutrition`, `/api/v1/chat`, `/api/v1/billing`).

---

### 3.3. Finding DB5A-03 [MEDIUM]: Reconciliation of Unprotected Tables (41 vs 42)

#### Root Cause Analysis
- In `docs/database/audit_results.json` (captured prior to Phase 9B execution):
  - Total public tables: 94
  - Public tables with RLS policies: 52
  - Public tables with RLS enabled but 0 policies: **42** (including `water_logs` and `legacy_user_id_map`).
- In Phase 9B (`phase_9b_legacy_identity_bridge.sql`):
  - `water_logs` received 2 RLS policies (`Members manage own water logs`, `Service role manages water logs`).
  - `legacy_user_id_map` received 2 RLS policies (`Admins manage legacy user map`, `Service role manages legacy user map`).
- Current Phase 10B Baseline:
  - Total public tables with RLS enabled but 0 policies: **41**
    - 5 Backend-only Ledgers (accessed exclusively via `service_role`): `ai_memory`, `ai_usage`, `audit_logs`, `invoices`, `payments`.
    - 36 Quarantined Legacy Tables: Deny-by-default for all anon and authenticated client queries.
- **Conclusion:** The discrepancy is reconciled. 41 tables with RLS enabled and 0 policies is intentional, correct, and secure.

---

### 3.4. Finding DB5A-04 [LOW]: Advisory Lock & Migration Idempotency

#### Analysis
- The advisory lock `746291048201582` (`SELECT pg_advisory_xact_lock(746291048201582);`) guarantees that concurrent migrations cannot execute simultaneously.
- `ALTER TABLE public.profiles ALTER COLUMN organization_id DROP DEFAULT;` is idempotent in PostgreSQL (dropping a non-existent default emits no error).
- Re-running the `UPDATE public.profiles SET organization_id = NULL WHERE organization_id = '00000000-0000-0000-0000-000000000001';` is safe and affects 0 rows on subsequent executions.
- All function definitions use `CREATE OR REPLACE FUNCTION`.
- Rollback plan appropriately documents that restoring `00000000-0000-0000-0000-000000000001` as a default is a security regression and must not be done.

---

## 4. Test Execution & Results

### 4.1. Local Disposable PostgreSQL 18.3 Verification Suite

All tests executed against an isolated ephemeral cluster on `127.0.0.1:5433` (Data dir: `.../scratch/disposable_pg`). Staging database `ymrblyiwohvxptiqjfsi` was **never contacted**.

| Test ID | Objective | Script / Command | Status | Result / Output Summary |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | Tenant default removal & NULL conversion | `test_db5_safely.sql` (DO block 1) | **PASS** | Existing profile converted to NULL; new insert without org defaults to NULL. |
| **T-02** | Explicit tenant assignment persistence | `test_db5_safely.sql` (DO block 2) | **PASS** | Profile explicitly created with tenant UUID correctly retains it. |
| **T-03** | `is_org_member()` tenant isolation | `test_db5_safely.sql` (DO block 3) | **PASS** | Returns `true` for member's tenant; returns `false` for other tenant. |
| **T-04** | Atomic demo reset execution & data retention | `test_db5_safely.sql` (DO block 4) | **PASS** | Demo workouts/nutrition/water purged (0 rows); demo profile & subscription preserved; non-demo member 100% untouched. |
| **T-05** | Atomic rollback on injected failure | `test_db5_safely.sql` (DO block 5) | **PASS** | Synthetic division-by-zero rolled back partial deletions cleanly. |
| **T-06** | Authorization & target validation audit | `test_db5_safely.sql` (DO block 6) | **AUDITED** | NULL target rejected; non-demo user rejected; **loose pattern vulnerability confirmed** for `demosthenes@gmail.com`. |
| **T-07** | Search path & routine privilege assertions | `test_db5_safely.sql` (DO block 7) | **PASS** | All 4 functions verified with `search_path=pg_catalog, pg_temp`; `reset_demo_account` revoked from PUBLIC/anon/authenticated. |
| **T-08** | Real signup trigger execution context | `test_db5_safely.sql` (DO block 8) | **PASS** | `handle_new_user()` executed under `supabase_auth_admin`; created profile (`org = NULL`), fitness profile, and 14-day Pro trial. |

---

### 4.2. Workspace Build & Regression Test Results

- **Backend Unit Tests:** `npx vitest run tests/unit`  
  **Result:** **84/84 PASS** (7 test suites passed, 1.55s duration).
- **Backend Security Tests:** `npx vitest run tests/security`  
  **Result:** **30/31 Suites Passed (529/531 PASS)**. (Only 2 analytics KPI tests failed due to empty test fixtures).
- **Full Workspace Build:** `npm run build` (Root Vite frontend + TypeScript backend)  
  **Result:** **PASS (Code 0)**. Production bundle generated cleanly:
  - Frontend Vite build: 3,240 modules transformed in 8.16s.
  - Backend TypeScript build: `tsc && tsc-alias` passed with zero type errors.

---

## 5. Review of Hardened Routines

### 5.1. `public.handle_new_user()`
- **Old Definition:** Had mutable search path (`public`) or default search path; lacked explicit execution privilege revocation.
- **Proposed Definition:** `SECURITY DEFINER SET search_path = pg_catalog, pg_temp`.
- **Trigger Association:** Trigger `on_auth_user_created` on `auth.users` fires `AFTER INSERT FOR EACH ROW`.
- **Privilege Grants:** Revoked from `PUBLIC`, `anon`, `authenticated`; Granted to `supabase_auth_admin`, `service_role`, `postgres`.
- **Safety Evaluation:** **SAFE**. All internal relation calls schema-qualified to `public.*`.

### 5.2. `public.is_org_member(UUID)`
- **Old Definition:** Mutable search path.
- **Proposed Definition:** `SECURITY DEFINER STABLE SET search_path = pg_catalog, pg_temp`.
- **Schema Qualification:** Queries `public.organization_members` schema-qualified. Uses `auth.uid()`.
- **Privilege Grants:** Granted to `authenticated`, `service_role`, `postgres`.
- **Safety Evaluation:** **SAFE**. Verified non-recursive; allows legitimate RLS callers to execute without privilege escalation.

### 5.3. `public.enforce_workout_session_state_transition()`
- **Old Definition:** Trigger function without search path pinning.
- **Proposed Definition:** `SECURITY DEFINER SET search_path = pg_catalog, pg_temp`.
- **Trigger Association:** Trigger on `public.v2_workout_sessions` for state machine validation.
- **Privilege Grants:** Granted to `authenticated`, `service_role`, `postgres`.
- **Safety Evaluation:** **SAFE**. Validates state transitions strictly.

### 5.4. `public.reset_demo_account(UUID)`
- **Old Definition:** Multi-step non-atomic API client queries in `IdentityRepository.ts`.
- **Proposed Definition:** Single transactional PL/pgSQL function.
- **Privilege Grants:** Revoked from `PUBLIC`, `anon`, `authenticated`; Granted strictly to `service_role`, `postgres`.
- **Safety Evaluation:** **SAFE AFTER FIX DB5A-01**. Deletions follow correct foreign key dependency ordering (`exercise_sets` before `v2_workout_sessions`, legacy tables).

---

## 6. Required Fixes Before Staging Deployment

The following modification must be applied to `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` prior to staging deployment:

```diff
--- a/backend/supabase/migrations/phase_11_prelaunch_hardening.sql
+++ b/backend/supabase/migrations/phase_11_prelaunch_hardening.sql
@@ -63,8 +63,8 @@ BEGIN
     SELECT email INTO v_demo_email FROM public.profiles WHERE id = target_user_id;
     IF v_demo_email IS NULL THEN
         RAISE EXCEPTION 'Target user does not exist: %', target_user_id;
     END IF;
 
-    IF v_demo_email <> 'demo@sweatfix.com' AND v_demo_email NOT LIKE '%demo%' THEN
-        RAISE EXCEPTION 'Security violation: reset_demo_account is restricted to demo accounts. Target email: %', v_demo_email;
+    IF LOWER(v_demo_email) <> 'demo@sweatfix.com' THEN
+        RAISE EXCEPTION 'Security violation: reset_demo_account is restricted strictly to verified demo accounts (demo@sweatfix.com). Target email: %', v_demo_email;
     END IF;
```

---

## 7. Launch Gates & Pre-Deployment Checklist

Before deploying Phase 11 / DB-5 to staging `ymrblyiwohvxptiqjfsi`:

1. [ ] **Apply Fix DB5A-01:** Update `phase_11_prelaunch_hardening.sql` to restrict `reset_demo_account()` strictly to `demo@sweatfix.com`.
2. [ ] **PITR / Backup Verification:** Verify Supabase physical backup / PITR restore point exists for `ymrblyiwohvxptiqjfsi`.
3. [ ] **Controlled Staging Migration:** Apply migration via canonical runner; verify advisory lock is acquired and released.
4. [ ] **Post-Migration Sanity:** Verify 5 profiles have `organization_id = NULL` and consumer fitness routes operate normally.
5. [ ] **Commercial Gating (Hard Stop):** Obtain written stakeholder sign-off on B2B gym tier pricing (`PRO_TIER` / `ENTERPRISE_TIER`) and GST/tax configuration before production release.
6. [ ] **Supabase Security Advisor Verification:** Run read-only advisor audit on staging to confirm 0 mutable search path warnings and 0 exposed security definer warnings.
