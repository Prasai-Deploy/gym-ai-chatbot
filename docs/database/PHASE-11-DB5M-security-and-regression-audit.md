# STRIVA V2 — Phase 11 / DB-5M: Post-Deployment Security & Regression Audit Report

**Document Version:** 1.0.0  
**Audit Date / Local Time:** 2026-10-14 13:06 IST  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Staging Baseline:** Exactly 26 migrations  
**Applied Migration Audited:** `phase_11_prelaunch_hardening.sql`  
**Remote DDL/DML Applied in this Phase:** Strictly 0 (Read-only verification only)  
**Production Database Status:** Untouched & Protected  
**Audit Verdict:** **DB-5M AUDIT PASSED WITH OPEN FINDINGS**  

---

## 1. Executive Summary

Following the DB-5L controlled deployment of `phase_11_prelaunch_hardening.sql`, an independent, read-only post-deployment security and regression audit was conducted against the live staging database `ymrblyiwohvxptiqjfsi`.

### Key Verified Results
1. **Deployment State:** Supabase staging project `ymrblyiwohvxptiqjfsi` is confirmed at exactly 26 migrations, with `phase_11_prelaunch_hardening.sql` recorded exactly once (`2026-10-14T07:07:47.914Z`).
2. **Routine Hardening:** All four DB-5 routines have pinned search paths (`search_path = pg_catalog, pg_temp`). `public.reset_demo_account(uuid)` is restricted strictly to `service_role` and `postgres`. `anon` and `authenticated` roles have zero execute privilege.
3. **Demo Reset Isolation:** Routine enforces exact case-insensitive equality against `demo@sweatfix.com`, child-before-parent deletion ordering, and type-correct integer resolution via `public.legacy_user_id_map`.
4. **Tenant Isolation:** Fallback UUID default on `public.profiles.organization_id` is completely removed (`NULL`). All 5 staging profiles hold `organization_id = NULL`.
5. **Regression Verification:** Full security test suite executed: **556 of 558 tests passed (99.64%)**. The only two failing tests are the previously documented synthetic mock table mismatches in `analytics.security.test.ts`. Full backend unit suite passed **84 / 84 tests (100%)**. Full workspace build (`npm run build`) succeeded with exit code 0.
6. **Catalog Reconciliation:** Identified 41 RLS tables without policies (intentional fail-closed/quarantine architecture), 5 routines with mutable search path (legacy), 6 security-definer routines accessible to authenticated users (functional requirement / legacy), and 46 unindexed foreign keys (performance backlog).

---

## 2. Section 1: Deployment State Confirmation

Live queries executed via PostgreSQL client against `db.ymrblyiwohvxptiqjfsi.supabase.co`:

```
[TARGET IDENTITY]
Host: db.ymrblyiwohvxptiqjfsi.supabase.co:5432
Database: postgres
Role: postgres
Engine Version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu

[MIGRATION HISTORY]
Total Recorded Migrations: 26
Target Record: phase_11_prelaunch_hardening.sql
Occurrences: Exactly 1
Applied Timestamp: 2026-10-14T07:07:47.914Z
```

---

## 3. Section 2: Audit of DB-5 Routine Security

Direct catalog inspection of `pg_proc`, `pg_trigger`, and `information_schema.routine_privileges`:

| Routine | Execution Mode | Search Path Config | Effective Execution ACL | Trigger Attachment | Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `public.reset_demo_account(uuid)` | `SECURITY DEFINER` | `pg_catalog, pg_temp` | `service_role`, `postgres` (`anon`: NO, `authenticated`: NO) | Standalone RPC (Backend service-role only) | **PASS** |
| `public.handle_new_user()` | `SECURITY DEFINER` | `pg_catalog, pg_temp` | `postgres`, `service_role`, `supabase_auth_admin` (`anon`: NO, `authenticated`: NO) | `AFTER INSERT ON auth.users FOR EACH ROW` | **PASS** |
| `public.is_org_member(uuid)` | `SECURITY DEFINER` | `pg_catalog, pg_temp` | `authenticated`, `service_role`, `postgres` (`anon`: NO) | Standalone RLS evaluation helper | **PASS** |
| `public.enforce_workout_session_state_transition()` | `SECURITY INVOKER` | `pg_catalog, pg_temp` | `authenticated`, `anon`, `service_role`, `postgres` | `BEFORE UPDATE OF state ON public.v2_workout_sessions FOR EACH ROW` | **PASS** |

### Verified Security Invariants
- **Unauthorized Invocation Defense:** `has_function_privilege('anon', 23769, 'EXECUTE')` returns `false`. `has_function_privilege('authenticated', 23769, 'EXECUTE')` returns `false`. Unauthenticated or regular authenticated users cannot execute `reset_demo_account`.
- **Search Path Hijacking Defense:** All 4 routines explicitly declare `SET search_path = pg_catalog, pg_temp`, preventing schema-search hijacking via maliciously injected local objects.
- **Trigger Integrity:** `handle_new_user` and `enforce_workout_session_state_transition` are correctly linked to active triggers and execute with schema-qualified object references.

---

## 4. Section 3: Demo-Reset Authorization & Data Isolation Review

Inspection of routine implementation and test coverage:

1. **Exact Account Identity Enforcement:**
   - Routine validates: `IF LOWER(v_demo_email) <> 'demo@sweatfix.com' THEN RAISE EXCEPTION ...`.
   - String equality eliminates substring matching (`%demo%`), prefix attacks (`evil-demo@...`), and domain spoofing (`demo@sweatfix.com.attacker.com`).
   - Covered by tests 6–10 in `backend/tests/security/db5b_demo_reset_authorization.security.test.ts`.
2. **UUID & Legacy Identity Resolution:**
   - Input parameter strictly typed as `UUID`.
   - Resolves legacy integer ID via `public.legacy_user_id_map WHERE profile_id = target_user_id`.
   - Asserts strict 1:1 mapping (`IF v_mapping_count > 1 THEN RAISE EXCEPTION ...`).
   - Legacy deletions execute strictly with integer comparisons (`WHERE user_id = v_legacy_user_id`), eliminating PostgreSQL error `42883 (operator does not exist: integer = uuid)`.
3. **Child-Before-Parent Deletion Order:**
   - Child `exercise_sets` deleted via subquery on `v2_workout_sessions` before parent `v2_workout_sessions` records are deleted, eliminating FK error `23503`.
4. **Water-Log & Unmapped Account Handling:**
   - Deletes from `water_logs` where `profile_id = target_user_id OR (v_legacy_user_id IS NOT NULL AND user_id = v_legacy_user_id)`.
   - For unmapped accounts (`v_legacy_user_id IS NULL`), all legacy table deletions are safely bypassed inside `IF v_legacy_user_id IS NOT NULL THEN ... END IF;`.
5. **Transactional Rollback Behavior:**
   - Rehearsed in disposable PostgreSQL instance during DB-5E: when any runtime statement fails, the entire transaction rolls back cleanly without leaving orphaned records.

---

## 5. Section 4: Automated Regression Checks

### 5.1. Full Security Test Suite
- **Command:** `npx vitest run -c backend/vitest.config.ts backend/tests/security`
- **Result:** **32 test files passed / 1 failed (97.0%)** | **556 tests passed / 2 failed (99.64%)** | Duration: 4.28s

### 5.2. Analysis of the Two Stale Analytics Failures
- **Failing Tests:**
  1. `backend/tests/security/analytics.security.test.ts > 5. Workout KPI computes sessions, duration, and exercise volume accurately` (Expected 1, Received 0)
  2. `backend/tests/security/analytics.security.test.ts > 6. Nutrition KPI calculates real calorie averages and adherence rates` (Expected 2100, Received 0)
- **Root Cause Analysis (Mismatch Identified):**
  - In Phase 10A and 10B, STRIVA V2 modernized its domain schema to canonical tables: `v2_workout_sessions`, `v2_nutrition_logs`, and direct `exercise_sets.session_id`.
  - `AnalyticsRepository.ts` was properly updated to query these modern V2 tables (lines 135, 163, 198).
  - However, the synthetic in-memory test fixture in `analytics.security.test.ts` (lines 42, 53, 70) still populates legacy mock tables: `db.workout_sessions` and `db.nutrition_logs`.
  - Because `AnalyticsRepository` queries `v2_workout_sessions` and `v2_nutrition_logs`, the mock returns empty arrays (`[]`), yielding 0 sessions and 0 calories.
  - Per instructions, this fixture was not modified to force a green test.

### 5.3. Unit Test Suite
- **Command:** `npx vitest run -c backend/vitest.config.ts backend/tests/unit`
- **Result:** **7 test files passed / 0 failed (100%)** | **84 tests passed / 0 failed (100%)** | Duration: 1.61s

### 5.4. Workspace Build
- **Command:** `npm run build`
- **Result:** **Exit Code 0** (Vite frontend built in 8.63s; backend `tsc && tsc-alias` compiled with zero TypeScript errors).

---

## 6. Section 5: Reconciliation of Live Catalog Security Findings

Direct catalog inspection of PostgreSQL 17.6 staging catalogs:

| Finding Area | Observed State | Classification | Rationale & Remediation |
| :--- | :---: | :---: | :--- |
| **RLS Tables Without Policies** | 41 tables | **Intentional Restriction** | Includes `_migrations` and 12 quarantined legacy tables (`progress`, `daily_plans`, `workout_plans`, etc.). In PostgreSQL, RLS enabled with 0 policies enforces complete fail-closed deny-by-default for non-superuser roles. |
| **Mutable Search Paths** | 5 public routines | **Confirmed Risk (Legacy)** | `get_admin_role()`, `is_admin()`, `update_membership_statuses()`, `update_modified_column()`, `update_updated_at_column()`. `get_admin_role` and `is_admin` are legacy routines to be patched in future legacy cleanup. |
| **SECURITY DEFINER Accessible to Users** | 6 routines | **Intentional Restriction / Functional** | `is_org_member` and `is_org_manager` must be executable by `authenticated` to evaluate RLS policies; both have pinned search paths. `get_admin_role` and `is_admin` remain legacy debt. |
| **Multiple Permissive Policies** | 2 tables (`ai_conversations`, `water_logs`) | **False Positive / Intentional Design** | Permissive policies in PostgreSQL are combined via `OR`. Dual consumer and staff policies on `ai_conversations` and user/service-role policies on `water_logs` are standard multi-role architecture. |
| **Unindexed Foreign Keys** | 46 foreign keys | **Investigation / Performance Backlog** | Foreign keys without leading indexes (e.g. `ai_messages_conversation_id_fkey`). Does not compromise authorization; recommended for index optimization prior to high-volume load. |
| **Leaked Password Protection** | Managed via Supabase Auth Console | **Operational Requirement** | Managed via Supabase dashboard Auth Settings (HaveIBeenPwned integration); must be verified in production dashboard. |

---

## 7. Section 6: Production Readiness Blockers

The following items are required prerequisites before production deployment:

| Blocker ID | Domain | Requirement | Current Status | Production Action |
| :---: | :--- | :--- | :---: | :--- |
| **BLK-01** | **Billing** | Razorpay Live Credentials & Webhook Secret | Configured for Test Mode (`rzp_test_...`) | Provision `rzp_live_...` credentials and HMAC webhook secret in production secrets manager. |
| **BLK-02** | **AI Layer** | Groq Production API Quotas & Fallback Routing | Staging API key active | Verify Groq production concurrency tiers, rate limits, and fallback provider routing. |
| **BLK-03** | **Commercial** | B2B Gym Tier Pricing & GST Rules | Fail-closed / Unapproved | Finalize commercial pricing and GST invoice rules with business stakeholders before opening B2B self-serve signup. |
| **BLK-04** | **Disaster Recovery** | Managed PITR & Offsite Backups | Logical SQL Backups verified | Upgrade to Supabase plan with native Continuous WAL Point-in-Time Recovery (PITR) for production customer data. |

*Note: In accordance with security standards, all credentials and secrets remain strictly redacted.*

---

## 8. Final Audit Determination

All DB-5 deployed routines, tenant isolation defaults, authorization gates, and data protection invariants are functioning correctly with zero regressions. Open findings consist strictly of legacy admin routine search paths, catalog performance indexes, and the two pre-existing mock test table mismatches.

# **DB-5M AUDIT PASSED WITH OPEN FINDINGS**
