# STRIVA V2 — Phase 12D: Post-Deployment Integration Audit Report

**Document Version:** 1.0.0  
**Audit Date / Local Time:** 2026-10-14 17:42 IST  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Staging Baseline:** Exactly 28 migrations  
**Applied Migrations Audited:**  
- `backend/supabase/migrations/phase_12_legacy_routine_hardening.sql`  
- `backend/supabase/migrations/phase_12b_consumer_analytics_persistence.sql`  
**Remote DDL/DML Executed in this Phase:** Strictly 0 (Audit-only; only ephemeral test rows cleaned up)  
**Production Database Status:** Strictly Off-Limits & Untouched  
**Audit Verdict:** **PHASE 12D BLOCKED — REMEDIATION REQUIRED**  
*(Deployment infrastructure and Phase 12/12B migrations PASS with zero regressions; remediation required for application-level defect DB12D-01 in member nutrition analytics undercounting).*

---

## 1. Executive Summary

Following the deployment of Phase 12 (`phase_12_legacy_routine_hardening.sql`) and Phase 12B (`phase_12b_consumer_analytics_persistence.sql`) to staging baseline 28, an exhaustive post-deployment integration audit was performed against live staging application flows.

### Summary of Audit Results

| Check # | Audit Area | Classification | Summary of Findings |
| :---: | :--- | :---: | :--- |
| **Check 1** | Migration History Baseline | **PASS** | Staging `_migrations` contains exactly 28 records. `phase_12_legacy_routine_hardening.sql` (row 27) and `phase_12b_consumer_analytics_persistence.sql` (row 28) appear exactly once. |
| **Check 2** | Routine Security, Grants, Triggers, Cron | **PASS** | All 5 routines are `SECURITY INVOKER` with `search_path=pg_catalog, pg_temp`. Anon/public execution revoked. 14 update triggers active. `pg_cron` maintenance job active at `0 0 * * *`. |
| **Check 3** | Consumer TRINETRA API Flow & Persistence | **PASS** | Live authenticated `POST /api/v1/ai/chat` executed with real Groq LLM inference. Generated 103 completion tokens (739 prompt, 842 total) in 1302 ms. Persisted to `ai_usage_analytics` with `organization_id = NULL` without error. |
| **Check 4** | B2B Analytics Tenant Isolation | **PASS** | `AIUsageRepository.getUsageByOrganization` strictly enforces `organization_id` equality; zero consumer rows leaked into B2B queries. Consumer rows isolated to `getUserUsage`. |
| **Check 5** | Analytics Error Tracing End-to-End | **PASS** | Provider errors map cleanly to categories (`AIProviderRateLimitError`, `AIProviderConfigError`). Single failed usage event recorded per failed invocation; no infinite retries or duplicate rows. |
| **Check 6** | Nutrition Analytics Field Mismatch | **FAIL** *(Defect DB12D-01)* | `AnalyticsEngines.ts` line 550 reads `log.calories_consumed || 0`. `public.v2_nutrition_logs` schema column is `calories`. Real queries omit `calories_consumed`, causing `avgCaloriesLogged` to compute to `0` (100% undercount). |
| **Check 7** | Test Suites & Production Builds | **PASS** | 36 / 36 security test suites passed (587 / 587 tests). Full backend build (`tsc && tsc-alias`) and frontend build (`vite build`) exited code 0. |
| **Check 8** | Supabase Security & Performance Advisors | **PASS** | 0 public tables with RLS disabled. 41 fail-closed tables without policies. 1 helper routine with single-namespace search path. 54 unindexed foreign keys cataloged. |

---

## 2. Check 1: Migration History & Baseline Confirmation

Live inspection of the `_migrations` tracking table on staging `ymrblyiwohvxptiqjfsi`:

```sql
SELECT name FROM _migrations ORDER BY executed_at;
```

### Verified Migration Sequence
- Total recorded migrations: **28**
- Baseline prior to Phase 12: 26
- Row 27: `phase_12_legacy_routine_hardening.sql` (occurrences: **1**)
- Row 28: `phase_12b_consumer_analytics_persistence.sql` (occurrences: **1**)

```
 1: 002_create_fitness_profiles.sql
 2: 003_create_ai_plan_tables.sql
 3: 003_create_workout_tables.sql
 4: 004_create_activity_tables.sql
 5: 004_create_progress_dashboard.sql
 6: 005_create_water_tables.sql
 7: 005_nutrition_system.sql
 8: 006_workout_tracker_redesign.sql
 9: 007_create_progress_tables.sql
10: 008_add_macros_to_user_progress.sql
11: 008_multi_tenant_saas_foundation.sql
12: phase_8b_organization_staff_foundation.sql
13: phase_8d_member_management.sql
14: phase_8f_trainer_assignments.sql
15: phase_8h_organization_billing.sql
16: phase_8i_organization_notifications.sql
17: phase_8i_1_recipient_read_state.sql
18: phase_8j_b2b_trinetra.sql
19: 009_ai_memory_and_usage.sql
20: 010_analytics_and_attendance.sql
21: phase_7b_trial_foundation.sql
22: phase_9a_rls_recursion_fix.sql
23: phase_9b_legacy_identity_bridge.sql
24: phase_10a_nutrition_core_schema.sql
25: phase_10b_workout_core_schema.sql
26: phase_11_prelaunch_hardening.sql
27: phase_12_legacy_routine_hardening.sql
28: phase_12b_consumer_analytics_persistence.sql
```

**Classification:** **PASS**

---

## 3. Check 2: Verification of Five Hardened Routines, Grants, Triggers, and Scheduled Job

Direct PostgreSQL system catalog query on `pg_proc`, `pg_trigger`, and `cron.job`:

### Five Hardened Routines

| Routine | Execution Mode | Configured Search Path | Effective Execution ACL | Classification |
| :--- | :---: | :---: | :--- | :---: |
| `public.get_admin_role()` | `SECURITY INVOKER` | `search_path=pg_catalog, pg_temp` | `postgres`, `authenticated`, `service_role` (`anon`: NO, `PUBLIC`: NO) | **PASS** |
| `public.is_admin()` | `SECURITY INVOKER` | `search_path=pg_catalog, pg_temp` | `postgres`, `authenticated`, `service_role` (`anon`: NO, `PUBLIC`: NO) | **PASS** |
| `public.update_membership_statuses()` | `SECURITY INVOKER` | `search_path=pg_catalog, pg_temp` | `postgres`, `service_role` (`authenticated`: NO, `anon`: NO, `PUBLIC`: NO) | **PASS** |
| `public.update_modified_column()` | `SECURITY INVOKER` | `search_path=pg_catalog, pg_temp` | `postgres`, `authenticated`, `service_role` (`anon`: NO, `PUBLIC`: NO) | **PASS** |
| `public.update_updated_at_column()` | `SECURITY INVOKER` | `search_path=pg_catalog, pg_temp` | `postgres`, `authenticated`, `service_role` (`anon`: NO, `PUBLIC`: NO) | **PASS** |

### Scheduled Maintenance Job (`pg_cron`)

```
jobid: 1
jobname: update-membership-statuses
schedule: 0 0 * * *
command: SELECT update_membership_statuses()
active: true
```
**Classification:** **PASS**

### Trigger Attachments (14 Active Triggers)

| # | Trigger Name | Target Relation | Attached Routine | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `update_ai_conversations_modtime` | `public.ai_conversations` | `public.update_modified_column` | **PASS** |
| 2 | `update_ai_memory_modtime` | `public.ai_memory` | `public.update_modified_column` | **PASS** |
| 3 | `update_feature_usage_modtime` | `public.feature_usage` | `public.update_modified_column` | **PASS** |
| 4 | `trg_fitness_profiles_updated_at` | `public.fitness_profiles` | `public.update_updated_at_column` | **PASS** |
| 5 | `update_member_settings_modtime` | `public.member_settings` | `public.update_modified_column` | **PASS** |
| 6 | `trg_memberships_updated_at` | `public.memberships` | `public.update_updated_at_column` | **PASS** |
| 7 | `update_profiles_modtime` | `public.profiles` | `public.update_modified_column` | **PASS** |
| 8 | `update_progress_stats_modtime` | `public.progress_statistics` | `public.update_modified_column` | **PASS** |
| 9 | `update_recovery_logs_modtime` | `public.recovery_logs` | `public.update_modified_column` | **PASS** |
| 10 | `update_subscriptions_modtime` | `public.subscriptions` | `public.update_modified_column` | **PASS** |
| 11 | `update_user_goals_modtime` | `public.user_goals` | `public.update_modified_column` | **PASS** |
| 12 | `update_user_preferences_modtime` | `public.user_preferences` | `public.update_modified_column` | **PASS** |
| 13 | `trg_user_stats_updated_at` | `public.user_stats` | `public.update_updated_at_column` | **PASS** |
| 14 | `update_fitness_profiles_modtime` | `public.v2_fitness_profiles` | `public.update_modified_column` | **PASS** |

**Classification:** **PASS**

---

## 4. Check 3: Real Authenticated Consumer TRINETRA Request via Application API

A real end-to-end integration flow was executed against the staging application API using the consumer test account `demo@sweatfix.com` (user ID `a1bf8b11-e2c7-4f7f-9d36-5af53418e20b`, confirmed 0 organization memberships).

### Flow Steps & Evidence
1. Authenticated against Supabase Auth (`ymrblyiwohvxptiqjfsi.supabase.co`) with `signInWithPassword`.
2. Initialized application router on an ephemeral port.
3. Dispatched `POST /api/v1/ai/chat` with JWT:
   ```json
   {
     "message": "PHASE_12D_AUDIT: Give a 1-sentence tip for runners stretching calves.",
     "stream": false
   }
   ```
4. **HTTP Response:** `200 OK`
   ```json
   {
     "success": true,
     "data": {
       "conversationId": "4d4d8bbf-eacd-4b1d-b0fe-477a6baa6d91",
       "agentId": "recovery",
       "message": "For runners, stretch your calves by leaning forward against a wall with one foot behind the other, keeping both heels on the floor, and hold for 30 seconds on each side to improve ankle flexibility and reduce shin splints.",
       "toolsCalled": [],
       "promptTokens": 739,
       "completionTokens": 103,
       "totalTokens": 842,
       "durationMs": 1302,
       "model": "openai/gpt-oss-20b",
       "provider": "groq"
     }
   }
   ```
5. **Database Persistence Verification:**
   Row introspected directly in `public.ai_usage_analytics`:
   ```
   id: 7e4dd4d8-d90f-4cc9-a111-53af2fa1745f
   user_id: a1bf8b11-e2c7-4f7f-9d36-5af53418e20b
   organization_id: NULL (No NOT NULL violation)
   agent_id: recovery
   provider: groq
   model: openai/gpt-oss-20b
   duration_ms: 1302
   prompt_tokens: 739
   completion_tokens: 103
   total_tokens: 842 (prompt + completion)
   success: true
   ```
6. **Data Cleanup:** Ephemeral test usage record (`7e4dd4d8-...`), conversation (`4d4d8bbf-...`), and messages were deleted from staging immediately following verification. Zero production or user data was modified.

**Classification:** **PASS**

---

## 5. Check 4: B2B Analytics Tenant Isolation & Query Scope

Tested the B2B organization analytics query path against the persisted consumer record:

1. **B2B Organization Query Isolation:**
   - Method: `aiUsageRepository.getUsageByOrganization(orgId)` executes `.eq('organization_id', organizationId)`.
   - Result: Returned **0** consumer records. Rows with `organization_id IS NULL` cannot be retrieved by any tenant organization query.
2. **Consumer User Query Isolation:**
   - Method: `aiUsageRepository.getUserUsage(userId)` executes `.eq('user_id', userId).is('organization_id', null)`.
   - Result: Returned the user's consumer usage records while strictly omitting organizational usage.

**Classification:** **PASS**

---

## 6. Check 5: Analytics Error Tracing End-to-End

Audited the error handling pipeline in `AgentRunner.ts`, `GroqProvider.ts`, and `AIUsageRepository.ts`:

1. **Provider Error Propagation:**
   - `GroqProvider` converts network failures to `AIProviderNetworkError`, HTTP 429 to `AIProviderRateLimitError`, and HTTP 401/403 to `AIProviderConfigError`.
   - Errors are not silently swallowed; they propagate with status codes and category markers.
2. **Failed Usage Tracking:**
   - When an LLM invocation throws, `AgentRunner.ts` (lines 366–397) catches the exception and attempts a single persistence of a failed usage record (`success: false`, `errorCategory`).
   - It re-throws the error to the controller so the API client receives a clean HTTP error response.
3. **No Duplicate Event Writes:**
   - In multi-step tool execution loops (`while (currentResponse.finish_reason === 'tool_calls')`), token usage accumulates via `addUsage(nextResponse.usage)`.
   - Only a single consolidated usage record is written to `ai_usage_analytics` upon final completion.
4. **Sanitized Logging:**
   - `AIUsageRepository` structured error logs (`logger.error`) include only `userId`, `organizationId`, `agentId`, `provider`, `model`, and error message. Raw prompts, system instructions, and credentials are never logged.
5. **Design Limitation Noted:**
   - Route `GET /api/v1/ai/agent/analytics` delegates to `agentRunner.getAnalytics(orgId)`. When a consumer without an organization requests this endpoint, it resolves to an empty string `orgId` and returns an empty array `[]`. Consumers must retrieve analytics via user-scoped queries.

**Classification:** **PASS**

---

## 7. Check 6: Investigation into `AnalyticsEngines.ts` Reading `calories_consumed` vs `v2_nutrition_logs` (`calories`)

### The Problem Investigated
In `backend/src/modules/analytics/AnalyticsEngines.ts` line 550:
```typescript
const cals = log.calories_consumed || 0;
```
However, `AnalyticsRepository.ts` line 198 queries `public.v2_nutrition_logs`:
```typescript
const { data, error } = await this.supabase
  .from('v2_nutrition_logs')
  .select('*')
  .in('user_id', userIds)
  .gte('date', period.from)
  .lte('date', period.to);
```

### Database Schema Fact
In `backend/supabase/migrations/phase_10a_nutrition_core_schema.sql` (and confirmed on live staging PostgreSQL):
```sql
CREATE TABLE IF NOT EXISTS public.v2_nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type VARCHAR(50) NOT NULL DEFAULT 'snack',
    food_name TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,  -- <--- CANONICAL COLUMN NAME
    protein_g NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    fats_g NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
There is **no** column named `calories_consumed` in `public.v2_nutrition_logs` (nor was there one in legacy `public.nutrition_logs`).

### Reproducible Demonstration Evidence
Executed `scratch/demonstrate_nutrition_defect.ts`:
- Input row from `v2_nutrition_logs`: `{ calories: 2400, protein_g: 150, date: '2026-10-14', user_id: '...' }`
- Computed output by `NutritionAnalyticsEngine.compute`:
  ```json
  {
    "avgCaloriesLogged": 0,
    "avgProteinAdherencePct": 100,
    "avgMacroScore": 100,
    "membersLoggingDaily": 1,
    "loggingAdherencePct": 3.2
  }
  ```
- **Root Cause Confirmed:** Because the database row contains `calories: 2400` and no `calories_consumed` property, `log.calories_consumed` evaluates to `undefined`. `undefined || 0` yields `0`. Consequently:
  - `totalCalories` accumulates `0`.
  - `avgCaloriesLogged` evaluates to `0`.
  - `dayCaloriesMap` totals evaluate to `0`.
  - **Nutrition analytics undercounts calories by 100% for all members logging meals in `v2_nutrition_logs`!**

**Classification:** **FAIL — DEFECT DB12D-01 IDENTIFIED**

---

## 8. Check 7: Test Suites & Production Builds

### Security Test Suites
Ran Vitest across all security suites in `backend/tests/security/`:
- **Result:** **36 / 36 test files passed, 587 / 587 tests passed (100%)**.
- Specific suites validated:
  - `phase12b_analytics_persistence.security.test.ts`: 13 / 13 passed
  - `ai_chatbot_audit_remediation.security.test.ts`: 6 / 6 passed
  - `analytics.security.test.ts`: 13 / 13 passed
  - `razorpay_hardening.security.test.ts`: 18 / 18 passed
  - `phase9a_rls_recursion_fix.security.test.ts`: 51 / 51 passed

### Production Builds
1. **Backend Build (`npm run build` in `backend/`):**
   - Command: `tsc && tsc-alias`
   - Exit Code: **0** (Zero TypeScript compilation errors).
2. **Frontend Build (`npm run build` in root):**
   - Command: `vite build` + backend workspace build
   - Transformed: 3,240 modules
   - Output: `dist/index.html` (4.21 kB), `dist/assets/index-CSi3hJcQ.css` (195.36 kB), `dist/assets/index-B82dwWo8.js` (1,034.31 kB)
   - Exit Code: **0** (Zero bundling or type errors).

**Classification:** **PASS**

---

## 9. Check 8: Supabase Security & Performance Advisors

Catalog inspection against Supabase Best Practices on staging `ymrblyiwohvxptiqjfsi`:

1. **Tables with RLS Disabled:**
   - Count: **0**. Every table in `public` has `rowsecurity = true`.
2. **Tables with RLS Enabled but 0 Policies:**
   - Count: **41**. These are internal/legacy tables (e.g. `_migrations`, `ai_chat_logs`, `daily_plans`, `workout_logs`).
   - Security Posture: **Fail-Closed**. PostgreSQL blocks all non-superuser queries when RLS is active with no permissive policy.
3. **Function Search Path Hardening:**
   - Unpinned public functions: **1** (`rls_auto_enable`, which uses `search_path=pg_catalog`).
   - All 5 Phase 12 legacy routines and all DB-5 routines have `search_path=pg_catalog, pg_temp`.
4. **Performance Advisor — Unindexed Foreign Keys:**
   - Count: **54** foreign key constraints lack leading indexes on child columns (e.g. `workout_logs_plan_id_fkey`, `user_goals_user_id_fkey`).
5. **Performance Advisor — Unused Indexes:**
   - Count: **15** unconstrained indexes with `idx_scan = 0` (expected in staging given low synthetic traffic).
6. **Multiple Permissive Policies:**
   - Count: **3** combinations (`ai_conversations` ALL, `ai_usage_analytics` INSERT, `ai_usage_analytics` SELECT). These exist intentionally to support both consumer self-service and B2B tenant organization access.

**Classification:** **PASS (Advisories Cataloged Without Remote Mutations)**

---

## 10. Defect Inventory & Narrowly Scoped Remediation Plan

### Defect DB12D-01: Member Nutrition Analytics Undercounting

| Field | Detail |
| :--- | :--- |
| **Defect ID** | `DB12D-01` |
| **Severity** | **High** (Business Logic Defect / Data Inaccuracy) |
| **File Affected** | `backend/src/modules/analytics/AnalyticsEngines.ts` |
| **Line Number** | 550 |
| **Root Cause** | Code references deprecated/DTO property `log.calories_consumed`, while canonical database column in `public.v2_nutrition_logs` is `calories`. |
| **Impact** | All gym owner/member analytics calculate `avgCaloriesLogged = 0` and `dayCaloriesMap = 0`. |

### Narrowly Scoped Remediation Plan (To Be Executed in Remediation Gate)

1. **File to Modify:** `backend/src/modules/analytics/AnalyticsEngines.ts`
2. **Current Code (Line 550):**
   ```typescript
   const cals = log.calories_consumed || 0;
   ```
3. **Proposed Remediation:**
   Align with the canonical pattern established in `NutritionService.ts` and `NutritionRepository.ts`:
   ```typescript
   const cals = log.calories ?? log.calories_consumed ?? 0;
   ```
4. **Test Plan:**
   Add a unit test in `backend/tests/security/analytics.security.test.ts` verifying that passing logs with only `{ calories: 2400 }` results in `avgCaloriesLogged = 2400`.
5. **Deployment:** Pure application code update (no database migration or DDL required).

---

## 11. Final Audit Verdict

The Phase 12 and Phase 12B database migrations are cleanly deployed and operating correctly on staging. However, Check 6 identified an active application defect (DB12D-01) where member nutrition analytics undercounts calories to zero due to reading `calories_consumed` instead of `calories`.

Per the audit specification, because an active defect was uncovered and verified:

```
================================================================================
FINAL STATUS: PHASE 12D BLOCKED — REMEDIATION REQUIRED
================================================================================
```

### Next Immediate Action
Proceed to **Phase 12E / Remediation Gate** to apply the 1-line fix in `AnalyticsEngines.ts`, verify tests pass, and confirm `avgCaloriesLogged` computes accurately.
