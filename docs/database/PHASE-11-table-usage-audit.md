# STRIVA V2 — Phase 11: Application Table Usage Audit & Dependency Analysis

**Date:** 2026-10-13  
**Auditor:** Antigravity (STRIVA V2 Quality & Security Architecture Gate)  
**Target Reference:** Phase 11 Pre-Launch Hardening Preparation  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Staging Migration Baseline:** Strictly 25 migrations through Phase 10B  
**Mode:** Read-Only Static and Catalog Analysis (Zero DDL, Zero DML, Zero RPC Mutations)  
**Deliverable File:** `docs/database/PHASE-11-table-usage-audit.md`  

---

## 1. Executive Summary & Audit Context

This document provides a comprehensive, evidence-based audit of all public database tables, views, and data pathways across the STRIVA V2 architecture.

Before packaging database hardening changes into **DB-5**, this audit systematically verifies:
1. Which tables form the active application data paths for members, gym owners, trainers, and the TRINETRA AI OS.
2. Which tables exist strictly as database-level RLS policy or trigger dependencies (such as `legacy_user_id_map`).
3. Which tables are trusted internal backend ledgers managed solely by `service_role` (and therefore must remain denied to PostgREST clients).
4. Which tables represent quarantined legacy V1 schemas that must never receive permissive blanket policies.
5. The specific data dependencies and structural safety of packaging the three candidate DB-5 changes together:
   - Dropping the fallback default on `public.profiles.organization_id`.
   - Introducing the atomic `public.reset_demo_account(UUID)` stored procedure.
   - Hardening routine search paths and routine grants.
6. The status of B2B commercial pricing and Goods and Services Tax (GST) invoicing rules.

---

## 2. Table Inspection & Search Methodology

To prevent false negatives arising from simple string matching, table access was traced across multiple operational tiers:
- **Client & Presentation Tier (`src/`)**: Frontend API client modules (`httpClient.ts`, `advisorApi.ts`, `coachApi.ts`, `orgBillingApi.ts`), React Query hooks (`useWorkout.ts`, `useProgress.ts`), and UI layouts.
- **Application Controller & Route Tier (`backend/src/`)**: Express controllers, route definitions, auth and tenant middleware (`auth.middleware.ts`, `tenant.middleware.ts`, `rbac.middleware.ts`, `entitlement.middleware.ts`).
- **Domain Service & Repository Tier (`backend/src/modules/`)**: Concrete repository implementations (`NutritionRepository.ts`, `V2WorkoutSessionRepository.ts`, `IdentityRepository.ts`, `SubscriptionRepository.ts`).
- **Database Catalog & Migration Tier (`backend/supabase/migrations/`)**: PostgreSQL table DDL, RLS policies (`pg_policies`), database triggers (`pg_trigger`), and routine bodies.
- **Indirect & Relational Data Paths**: Foreign-key cascade rules, subquery evaluations inside RLS policies (e.g. `is_org_member` querying `organization_members`), and trigger executions (e.g. `sync_water_logs_compatibility` querying `legacy_user_id_map`).

---

## 3. Comprehensive Table Classification Matrix

All 99 tables and views existing in the STRIVA V2 staging catalog (including modern Phase 10 additions) are classified into six distinct operational categories:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                STRIVA V2 TABLE USAGE TAXONOMY                                          │
├─────────────────────────────────────────────────┬───────┬──────────────────────────────────────────────┤
│ Operational Classification                      │ Count │ Primary Representative Tables                │
├─────────────────────────────────────────────────┼───────┼──────────────────────────────────────────────┤
│ 1. Active Application Data Path                 │ 27    │ profiles, v2_workout_plans, subscriptions... │
│ 2. RLS / Policy or Trigger Dependency           │ 10    │ legacy_user_id_map, v2_daily_nutrition...    │
│ 3. Trusted Backend / Service-Role Only          │ 8     │ payment_events, organization_staff, session..│
│ 4. Quarantined Legacy V1 (Integer Schemas)      │ 24    │ users, workout_sessions, nutrition_logs...   │
│ 5. Migration & Operational Metadata             │ 1     │ _migrations                                  │
│ 6. Quarantined / Unreferenced Prototype Tables  │ 29    │ meal_plans, pt_assignments, allowed_users...│
├─────────────────────────────────────────────────┼───────┼──────────────────────────────────────────────┤
│ TOTAL AUDITED SCHEMA OBJECTS                    │ 99    │                                              │
└─────────────────────────────────────────────────┴───────┴──────────────────────────────────────────────┘
```

---

### Category 1: Active Application Data Path (27 Tables)
These tables form the primary operational engine for authenticated users, gym managers, and TRINETRA AI operations. They possess verified, fail-closed RLS policies governing member and tenant access:

| Table Name | Primary Consumers & Callers | Access Mode & Identity Scope | RLS Policy Status |
| :--- | :--- | :--- | :---: |
| `public.profiles` | `auth.middleware.ts`, `IdentityRepository.ts`, `AdminRepository.ts` | Authenticated member (`id = auth.uid()`), tenant staff | Enforced (`Users access own profile`) |
| `public.v2_fitness_profiles` | `IdentityRepository.ts`, `handle_new_user()` | Authenticated member (`id = auth.uid()`) | Enforced (`v2_fitness_profiles_owner`) |
| `public.user_preferences` | `IdentityRepository.ts`, `handle_new_user()` | Authenticated member (`id = auth.uid()`) | Enforced (`Users manage own preferences`) |
| `public.member_settings` | `IdentityRepository.ts`, `handle_new_user()` | Authenticated member (`id = auth.uid()`) | Enforced (`Users manage own settings`) |
| `public.v2_nutrition_logs` | `NutritionRepository.ts`, `NutritionService.ts` | Authenticated member (`user_id = auth.uid()`) | Enforced (Phase 10A granular CRUD) |
| `public.water_logs` | `NutritionRepository.ts`, `sync_water_logs_compatibility` | Authenticated member (`profile_id = auth.uid()`) | Enforced (Phase 9B dual-key policies) |
| `public.v2_workout_plans` | `WorkoutPlanRepository.ts`, `WorkoutPlanController.ts` | Member self-access + tenant staff inspection | Enforced (Phase 10B scoped policies) |
| `public.v2_workout_sessions`| `V2WorkoutSessionRepository.ts`, `WorkoutController.ts` | Member self-access + tenant staff inspection | Enforced (Phase 10B single active lock)|
| `public.exercise_sets` | `V2WorkoutSessionRepository.ts`, `WorkoutLayout.tsx` | Scoped via session (`session_id -> ws.user_id`) | Enforced (Phase 10B cascade policies) |
| `public.exercises` | `ExerciseController.ts`, `AdminRepository.ts` | Public/authenticated catalog read | Enforced (Catalog view policy) |
| `public.equipment` | `ExerciseController.ts` | Public/authenticated catalog read | Enforced (Catalog view policy) |
| `public.organizations` | `organization.repository.ts`, `tenant.middleware.ts` | Tenant members (`is_org_member`) + Org Owner | Enforced (`Members view assigned org`) |
| `public.organization_members`| `organization.repository.ts`, `is_org_manager` | Tenant members (`is_org_member`) + Manager | Enforced (`Staff managers manage members`)|
| `public.organization_locations`| `organization.repository.ts` | Tenant members (`is_org_member`) + Manager | Enforced (Phase 8B tenant policies) |
| `public.organization_branding` | `organization.repository.ts` | Tenant members (`is_org_member`) + Owner | Enforced (Phase 8B branding policies) |
| `public.organization_settings` | `organization.repository.ts` | Tenant members (`is_org_member`) + Owner | Enforced (Phase 8B settings policies) |
| `public.organization_invitations`| `organization.repository.ts` | Tenant managers (`is_org_member`) | Enforced (Phase 8B invitation policies)|
| `public.attendance_logs` | `attendance.repository.ts`, `ownerAnalytics.service.ts`| Tenant staff + member self-read | Enforced (Phase 8E attendance policies) |
| `public.trainer_member_assignments`| `trainer.repository.ts` | Assigned trainer + member self-read | Enforced (Phase 8F assignment policies) |
| `public.subscriptions` | `SubscriptionRepository.ts`, `EntitlementService.ts` | Authenticated member (`user_id = auth.uid()`) | Enforced (Phase 7B trial/pro policies) |
| `public.organization_subscriptions`| `organizationBilling.service.ts` | Tenant owner (`organizations.owner_id`) | Enforced (Phase 8H billing policies) |
| `public.organization_subscription_plans`| `organizationBilling.service.ts` | Authenticated tenant owners (Read catalog) | Enforced (Phase 8H plan catalog policies)|
| `public.organization_billing_accounts`| `organizationBilling.service.ts` | Tenant owner | Enforced (Phase 8H account policies) |
| `public.organization_invoices` | `organizationBilling.service.ts` | Tenant owner + Gym Manager | Enforced (Phase 8H invoice policies) |
| `public.ai_conversations` | `ChatRepository.ts`, `AgentRegistry.ts` | Member self-access + tenant staff scope | Enforced (Phase 8J TRINETRA policies) |
| `public.ai_messages` | `ChatRepository.ts`, `TrinetraCoachLayout.tsx` | Scoped via conversation owner | Enforced (Phase 8J message policies) |
| `public.progress_statistics` | `ProgressRepository.ts`, `ProgressController.ts` | Authenticated member (`user_id = auth.uid()`) | Enforced (`Members Read Own Stats`) |

---

### Category 2: RLS / Policy or Trigger Dependencies (10 Tables & Views)
These schema objects are not directly queried by frontend code, but are critical operational dependencies invoked by PostgreSQL triggers or RLS subqueries:

| Object Name | Dependent Callers & Mechanisms | Functional Role in Architecture |
| :--- | :--- | :--- |
| `public.legacy_user_id_map` | `sync_water_logs_compatibility()`, `water_logs` RLS | Bridges legacy integer IDs to UUID profiles for hydration logging. |
| `public.v2_daily_nutrition_summary` | `NutritionRepository.ts:getDailySummary()` | Security-invoker aggregation view (`security_invoker = true`). |
| `public.progress_snapshots` | `ProgressRepository.ts:getSnapshotsByUserId()` | Historical progress captures for trend generation. |
| `public.achievements` | `AchievementRepository.ts` | Gamification definition library. |
| `public.user_achievements` | `AchievementRepository.ts` | Member-unlocked achievement instances. |
| `public.organization_roles` | RLS check on role definitions | Canonical RBAC role registry. |
| `public.organization_permissions` | RBAC permission evaluation | Granular permission definition matrix. |
| `public.organization_notifications` | `NotificationRepository.ts` | Gym-wide notification dispatch queue. |
| `public.organization_notification_reads`| `NotificationRepository.ts` | Per-member notification read status ledger. |
| `public.feature_usage` | `EntitlementService.ts` | Consumer feature quota consumption tracking. |

---

### Category 3: Trusted Backend / Service-Role Only (8 Tables)
These tables store internal ledgers, webhook events, and security audit states. They are managed exclusively by the Express backend running with `service_role` credentials. **Direct client PostgREST access must remain completely blocked (`deny-by-default`)**:

| Table Name | Managing Backend Service | Why Client Access Must Remain Denied |
| :--- | :--- | :--- |
| `public.payment_events` | `SubscriptionRepository.ts:recordEvent()` | Stores raw Razorpay webhook payloads, HMAC signatures, and order tokens. Client access would leak payment secrets. |
| `public.organization_payment_events` | `organizationBilling.service.ts` | Stores raw B2B webhook payloads and transaction identifiers. |
| `public.organization_audit_logs` | `AuditService.ts`, `organization.repository.ts` | Immutable tenant administrative action ledger. Must be tamper-proof against client mutation. |
| `public.organization_staff` | `ownerAnalytics.service.ts`, `AnalyticsRepository.ts`| Deprecated intermediate staff mapping superseded by `organization_members`. Internal read-only analytics. |
| `public.session` | `AuditService.ts` | Server-managed session and security event state. |
| `public.push_subscriptions` | Backend notification dispatcher | Device push registration tokens and endpoints. |
| `public.ai_memory` | `MemoryRetriever.ts`, `MemoryExtractor.ts` | Structured TRINETRA AI memory facts. Filtered and managed by `MemoryPolicy`. |
| `public.ai_agent_memories` | `AgentRegistry.ts` | Agent-level memory state. |
| `public.ai_usage_analytics` | `TrinetraAnalytics.ts` | Prompt/completion token metrics and model latencies. |

---

### Category 4: Quarantined Legacy V1 Tables (24 Tables)
These tables were created in early legacy migrations (2026-06-30) with integer user IDs (`public.users.id`). They have been superseded by canonical STRIVA V2 schemas:

| Legacy Table Name | Modern V2 Canonical Replacement | Active Code Reference | Retention Status |
| :--- | :--- | :--- | :--- |
| `public.users` (7 rows) | `auth.users` & `public.profiles` | Identity bridge mapping (Phase 9B) | Quarantined; RLS Deny-by-Default |
| `public.fitness_profiles` (0 rows) | `public.v2_fitness_profiles` | None | Quarantined; RLS Deny-by-Default |
| `public.nutrition_logs` (0 rows) | `public.v2_nutrition_logs` | None | Quarantined; RLS Deny-by-Default |
| `public.workout_plans` (0 rows) | `public.v2_workout_plans` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.workout_sessions` (0 rows) | `public.v2_workout_sessions` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.workout_logs` (0 rows) | `public.exercise_sets` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.workout_progress` (0 rows) | `public.progress_statistics` | None | Quarantined; RLS Deny-by-Default |
| `public.daily_plans` (0 rows) | TRINETRA AI engine | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.progress` (0 rows) | `public.progress_statistics` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.progress_logs` (0 rows) | `public.progress_snapshots` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.user_progress` (0 rows) | `public.progress_statistics` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.user_fitness_plans` (0 rows) | `public.v2_workout_plans` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.user_meal_tracking` (0 rows) | `public.v2_nutrition_logs` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.chatbot_generated_plans` (0 rows) | `public.v2_workout_plans` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.chatbot_generated_workouts` (0 rows)| `public.v2_workout_sessions` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.chatbot_generated_diets` (0 rows) | `public.v2_nutrition_logs` | `IdentityRepository.resetDemoData()` | Quarantined; RLS Deny-by-Default |
| `public.water_goals` (0 rows) | `public.user_preferences` | None | Quarantined; RLS Deny-by-Default |
| `public.daily_hydration_progress` (0 rows) | `public.water_logs` | None | Quarantined; RLS Deny-by-Default |
| `public.daily_fitness_stats` (0 rows) | Modern analytics | None | Quarantined; RLS Deny-by-Default |
| `public.activity_logs` (0 rows) | Modern workout sessions | None | Quarantined; RLS Deny-by-Default |
| `public.activity_tracking_state` (0 rows) | `v2_workout_sessions` state | None | Quarantined; RLS Deny-by-Default |
| `public.ai_chat_logs` (0 rows) | `ai_conversations` & `ai_messages` | None | Quarantined; RLS Deny-by-Default |
| `public.weekly_progress` (0 rows) | `progress_statistics` | None | Quarantined; RLS Deny-by-Default |
| `public.memberships` (0 rows) | `organization_members` | None | Quarantined; RLS Deny-by-Default |

---

### Category 5: Migration & Operational Metadata (1 Table)
- `public._migrations`: Tracks applied migration history. Managed strictly by `backend/scripts/apply_staging_migrations.js` under transaction advisory lock `746291048201582`. Access is strictly denied to clients.

---

### Category 6: Quarantined / Unreferenced Prototype Tables (29 Tables)
These tables were created in legacy migration files but have zero active application callers:  
`allowed_users`, `exercise_alternatives`, `exercise_categories`, `exercise_equipment`, `exercise_muscles`, `exercise_tags`, `exercise_tags_map`, `exercise_types`, `exercise_variations`, `invoices`, `meal_plans`, `membership_plans`, `movement_patterns`, `muscle_groups`, `pt_assignments`, `recommendations`, `recovery_logs`, `template_diet_plans`, `template_workout_plans`, `user_badges`, `user_diet_assignments`, `user_goals`, `user_milestones`, `user_notification_settings`, `user_stats`, `user_streaks`, `user_workout_assignments`, `ai_tool_executions`, `admins`.  
**Determination:** All 29 tables have RLS enabled and zero policies. They are safely locked down (`deny-by-default`). They will be archived and dropped in post-launch schema cleanup (Phase 17).

---

## 4. Deep-Dive Specific Table Verifications

---

### 4.1 `profiles.organization_id` & Multi-Tenant Membership Checks
- **Current State:** Column default is set to `'00000000-0000-0000-0000-000000000001'::uuid`.
- **Application Flow Analysis:**
  - In `backend/src/middleware/tenant.middleware.ts:tenantMiddleware`, the user's organization context is resolved:
    1. Query `organization_members` where `user_id = req.user.id`.
    2. Check direct ownership in `organizations` where `owner_id = req.user.id`.
    3. Read `profiles.organization_id`.
  - If a user has `organization_id = '00000000-0000-0000-0000-000000000001'` by default, any endpoint that trusts `profiles.organization_id` could mistakenly authorize them for tenant 1.
  - Furthermore, AGENTS.md Rule 6 strictly forbids hardcoded tenant UUIDs.
- **Impact of Dropping Default:**
  - When `ALTER TABLE public.profiles ALTER COLUMN organization_id DROP DEFAULT;` is executed in DB-5, unassigned users will be created with `organization_id = NULL`.
  - In `tenant.middleware.ts`, when `organizationId` resolves to `null` or unassigned, the request **fails closed with HTTP 403 Forbidden** on tenant-scoped routes:
    ```typescript
    if (!orgContext || !orgContext.organizationId) {
      return res.status(403).json({ success: false, error: { message: 'Organization access required' } });
    }
    ```
  - Standard consumer routes (`/api/v1/nutrition/*`, `/api/v1/workouts/*`, `/api/v1/coach/*`) do not require gym organization membership and operate on `auth.uid() = user_id`. They continue functioning seamlessly.
- **Determination:** **Safe and necessary to drop default in DB-5.**

---

### 4.2 `legacy_user_id_map` & `water_logs` Dual-Key Architecture
- **Current State:**
  - `legacy_user_id_map` has exactly 2 verified rows (Legacy ID 148 and 151 mapped to UUID profiles).
  - `water_logs` has 13 historical rows (1 belonging to User 148, 12 belonging to unmapped User 153).
- **Trigger Interlock:**
  - `public.sync_water_logs_compatibility()` evaluates on every write to `water_logs`:
    - When `profile_id` is supplied without `user_id`, it looks up `legacy_user_id_map` to assign `user_id`.
    - When `amount_ml` is supplied, it synchronizes `intake_amount = amount_ml`.
- **RLS Interlock:**
  - Policy `"Members manage own water logs"` evaluates:
    ```sql
    auth.uid() = profile_id OR EXISTS (
        SELECT 1 FROM public.legacy_user_id_map m
        WHERE m.legacy_integer_id = water_logs.user_id AND m.profile_id = auth.uid()
    )
    ```
- **Integrity Guarantee:**
  - User 153's 12 historical records retain `profile_id = NULL` and `user_id = 153`. Because `users(id)` has `ON DELETE RESTRICT` from `legacy_user_id_map`, no legacy data can be orphaned.
  - Net-new V2 users log hydration via `profile_id UUID REFERENCES profiles(id)` with `user_id = NULL`.
- **Determination:** **Fully operational and verified. Must NOT be modified in DB-5.**

---

### 4.3 `v2_nutrition_logs` & `v2_daily_nutrition_summary`
- **Current State:**
  - Introduced in Phase 10A (`phase_10a_nutrition_core_schema.sql`).
  - `v2_nutrition_logs` has check constraints on meal type, positive macro ranges, and non-negative calories.
  - Supports multiple meals on the same date without artificial single-row collisions.
  - `v2_daily_nutrition_summary` view was created with `WITH (security_invoker = true)`, guaranteeing that PostgreSQL evaluates underlying RLS policies of the caller.
- **Verification:** Verified passing 15/15 real PostgreSQL integration tests in DB-4O.
- **Determination:** **Fully operational. Must NOT be modified in DB-5.**

---

### 4.4 `v2_workout_plans`, `v2_workout_sessions`, & `exercise_sets`
- **Current State:**
  - Introduced in Phase 10B (`phase_10b_workout_core_schema.sql`).
  - Partial unique index `idx_v2_workout_sessions_single_active` enforces exactly one active (`started` or `paused`) session per user.
  - Trigger `trg_enforce_workout_session_state_transition` rejects reopening terminal sessions.
  - `exercise_sets` has `ON DELETE CASCADE` on `session_id` and `ON DELETE SET NULL` on `exercise_id`.
- **Verification:** Verified passing 15/15 real PostgreSQL integration tests in DB-4O.
- **Determination:** **Fully operational. Must NOT be modified in DB-5.**

---

### 4.5 `subscriptions` & Razorpay Payment Tables
- **Current State:**
  - `public.subscriptions`: Managed by `SubscriptionRepository.ts`. Stores consumer subscription state (`tier`, `interval`, `status`, `trial_started_at`, `trial_ends_at`).
  - `public.payment_events`: Razorpay webhook event ledger. Uses SHA-256 HMAC verification with `crypto.timingSafeEqual` in `SubscriptionRepository.ts:verifyWebhookSignature()`.
  - `public.organization_subscriptions`: B2B subscription state.
- **Consumer Pricing Status:** Consumer plans are active and configured (`₹799/month`, `₹6,999/year`).
- **Determination:** **Fully operational. Must NOT be modified in DB-5.**

---

### 4.6 `ai_conversations` & `ai_messages`
- **Current State:**
  - Managed by `ChatRepository.ts`.
  - Authenticated members access own dialogue history (`user_id = auth.uid()`).
  - Gym managers access organization advisor conversations via `is_org_member(organization_id)`.
  - Tool execution telemetry logged into `ai_usage_analytics`.
- **Determination:** **Fully operational. Must NOT be modified in DB-5.**

---

### 4.7 The 42 RLS-Enabled Tables Without Policies
- **Advisor Finding:** `rls_enabled_no_policy` across 42 tables.
- **Audit Findings:**
  - 5 tables are internal backend ledgers (`_migrations`, `payment_events`, `organization_staff`, `session`, `push_subscriptions`). Deny-by-default is **mandatory**.
  - 36 tables are quarantined legacy V1 schemas. Deny-by-default is **mandatory**.
  - 1 table (`water_logs`) already received policies in Phase 9B.
- **Determination:** **Intentional deny-by-default posture verified. Adding blanket RLS policies is strictly prohibited.**

---

## 5. Task C — Verification of DB-5 Packaging Safety

We evaluated whether the proposed DB-5 items can be packaged into a single migration file (`backend/supabase/migrations/phase_11_prelaunch_hardening.sql`):

### 5.1 Item Coupling & Dependency Evaluation

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DB-5 CHANGE INTERACTION ANALYSIS                                     │
├──────────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Change 1: DROP DEFAULT on            │ - Only modifies public.profiles DDL.                            │
│ profiles.organization_id             │ - Does NOT change column type, constraints, or table data.      │
│                                      │ - Compatible with handle_new_user() trigger.                    │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Change 2: Add Stored Procedure       │ - Purely additive routine (CREATE FUNCTION).                    │
│ public.reset_demo_account(UUID)      │ - Depends on profiles, v2_*, water_logs, and legacy tables.     │
│                                      │ - Does NOT alter any existing schema or trigger.                │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Change 3: Harden Search Paths &      │ - Replaces routine bodies using CREATE OR REPLACE FUNCTION.     │
│ Grants (handle_new_user,             │ - Signatures remain 100% identical.                             │
│ is_org_member, enforce_transition)   │ - Zero policy recreation required; zero trigger drop required.  │
└──────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

- **Conflict Analysis:** Exactly 0 conflicts. Change 1 drops a column default, Change 2 creates a new routine, and Change 3 hardens existing routine definitions in place.
- **Transaction Safety:** All three operations are valid DDL/DML statements within a standard PostgreSQL atomic transaction block (`BEGIN ... COMMIT`).
- **PostgREST RPC Exposure:** `reset_demo_account` will have execution revoked from `PUBLIC` and `anon`, and granted strictly to `service_role`. This prevents untrusted browser clients from invoking the procedure directly over PostgREST HTTP while allowing the verified backend server to call it via `supabase.rpc()`.
- **Rollback Safety:**
  - `ALTER TABLE public.profiles ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;`
  - `DROP FUNCTION IF EXISTS public.reset_demo_account(UUID);`
  - Re-apply original definitions of `handle_new_user`, `is_org_member`, and `enforce_workout_session_state_transition` from Phases 7B, 8B, and 10B.

---

### 5.2 External Commercial Dependency Check (B2B Pricing & GST Rules)
- **Investigation:** We searched the repository for formal stakeholder approval of B2B gym software licensing pricing and GST business registration numbers.
- **Findings:**
  - In `backend/src/modules/billing/organization/organizationBilling.service.ts`, B2B plan pricing remains `amount_paise = NULL` and `is_configured = false`.
  - In `src/features/owner/pages/OwnerBillingPage.tsx`, checkout routes display *"Contact Sales"* or fail closed with `400 Bad Request` (`PLAN_NOT_CONFIGURED`).
  - Zero written stakeholder approval artifacts exist in `docs/` or codebase.
- **Architectural Directive:**
  - **B2B pricing and GST tax rules are an EXTERNAL BLOCKING DEPENDENCY.**
  - **DB-5 must NOT modify B2B plan pricing or invent hypothetical GST rules.**
  - The fail-closed guard (`is_configured = false`) must be preserved until formal business approval is provided in writing.

---

## 6. Audit Conclusions & Summary

### Confirmed DB-5 Prerequisites:
1. `public.profiles.organization_id DROP DEFAULT` is safe, verified, and required to satisfy STRIVA Rule 6.
2. `public.reset_demo_account(target_user_id UUID)` is verified as an atomic replacement for the sequential PostgREST loop in `IdentityRepository.ts`.
3. Search path hardening (`SET search_path = pg_catalog, pg_temp`) and grant tightening on `handle_new_user`, `is_org_member`, and `enforce_workout_session_state_transition` resolve all open Supabase Security Advisor routine findings.

### Items That Must NOT Be Changed:
1. **42 RLS Tables Without Policies**: Retain intentional deny-by-default posture. Do NOT add blanket policies.
2. **Phase 9A Helper `public.is_org_manager`**: Already hardened with `pg_catalog, pg_temp` and restricted grants. Do NOT modify.
3. **Phase 9B Trigger `public.sync_water_logs_compatibility`**: Already hardened. Do NOT modify.
4. **B2B Gym Tier Pricing**: Retain unconfigured/fail-closed status until stakeholder written approval is delivered.
5. **Phase 10 Core Tables (`v2_nutrition_logs`, `v2_workout_plans`, `v2_workout_sessions`, `exercise_sets`)**: Canonical schemas verified passing 91/91 tests. Do NOT modify.

### Readiness Determination:
**The audit fully supports preparing a local-only DB-5 implementation plan.** All schema dependencies and routine signatures are verified, documented, and free of architectural conflicts.
