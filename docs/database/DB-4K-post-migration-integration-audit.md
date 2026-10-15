# STRIVA V2 — DB-4K: Post-Migration Application Integration Audit Report

**Document Version:** 1.0.0  
**Audit Date:** October 12, 2026  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Migration Count:** `25`  
**Latest Deployed Migration:** `phase_10b_workout_core_schema.sql`  
**Overall Integration Status:** **`CONDITIONAL PASS (REMEDIATION REQUIRED PRIOR TO PRODUCTION)`**  

---

## 1. EXECUTIVE SUMMARY

Following the successful deployments of **Phase 10A** (Nutrition Core Schema) and **Phase 10B** (Workout Core Schema) to staging project `ymrblyiwohvxptiqjfsi`, a comprehensive end-to-end integration audit was conducted. The audit traced both domains from member-facing UI through API routers, business services, data repositories, TRINETRA AI tools, analytics, and database catalogs.

### Key Conclusions
1. **Database & Core Backend Contract (PASS):**
   - The deployed staging database is 100% sound with all 25 migrations recorded.
   - All canonical tables (`public.v2_nutrition_logs`, `public.v2_workout_plans`, `public.v2_workout_sessions`, `public.exercise_sets`) and views (`public.v2_daily_nutrition_summary` with `security_invoker = true`) exist with active RLS, strict constraints, single-active session index, and state transition locks.
   - Canonical backend domain services (`NutritionService`, `WorkoutExecutionService`) and API routes (`/api/v1/nutrition/...`, `/api/v1/workouts/...`) operate with full fidelity and robust error reporting.
2. **TRINETRA AI & Analytics (PASS):**
   - `ContextBuilder` accurately differentiates between legitimate zero/empty states and offline telemetry errors using `telemetryStatus`.
   - `GetNutritionTool` and `GetTodayWorkoutTool` delegate exclusively to canonical services and enforce session member scoping without cross-user data leakage.
   - `AnalyticsRepository` has already migrated to `v2_workout_sessions`, `exercise_sets`, and `v2_nutrition_logs`.
3. **Application & UI Integration Deficiencies (REMEDIATION REQUIRED):**
   - **Workout Set Persistence Disconnect:** `WorkoutLayout.tsx` calls `logSet` without creating or providing a `sessionId`, uses `camelCase` keys (`exerciseId`, `weightKg`) instead of expected `snake_case`, and silently swallows network/server errors in a `try/catch` block, advancing the local set counter without database persistence.
   - **Dashboard Meal Logging Route Mismatch:** `DashboardPage.tsx` and `dashboard.service.ts` submit meal and water data to `/intelligence/nutrition/log` instead of canonical `/nutrition/meals` and `/nutrition/water`. The intelligence endpoint attempts an `.upsert()` with `onConflict: 'user_id,date'`, which fails against `v2_nutrition_logs` because the table intentionally permits multiple meals per date without a unique constraint.
   - **Outdated Legacy Aliases:** `src/api/workoutApi.ts` contains legacy fallback stubs mapping `getTodayWorkout`, `getHistory`, and `getPlans` to `/workouts/programs`.

---

## 2. DEPLOYED BASELINE VERIFICATION (READ-ONLY STAGING AUDIT)

Read-only SQL queries against staging project `ymrblyiwohvxptiqjfsi` confirmed:

| Verification Target | Requirement | Live Staging Observation | Status |
| :--- | :--- | :--- | :--- |
| **Migration Ledger** | Exactly 25 rows | Verified 25 entries in `public._migrations` | **PASS** |
| **Phase Entries** | 9A, 9B, 10A, 10B present | All 4 migrations present with sequential timestamps | **PASS** |
| **`v2_nutrition_logs`** | 12 columns, check constraints, RLS | All columns, macro constraints, and RLS enabled | **PASS** |
| **`v2_daily_nutrition_summary`** | Security invoker view | Exists with `["security_invoker=true"]` in catalog | **PASS** |
| **`v2_workout_plans`** | UUID PK, profile FK, schedule JSONB | Canonical schema, foreign keys, and RLS verified | **PASS** |
| **`v2_workout_sessions`** | State checks, single-active index | 7 state check, unique index on `started/paused` active | **PASS** |
| **`exercise_sets`** | Cascade to session, SET NULL on exercise | FK cascade rules, constraints, and RLS verified | **PASS** |
| **Historical Hydration Baseline** | Exactly 13 `water_logs` rows | 13 rows intact, `amount_ml` dual-key populated | **PASS** |
| **Legacy Identity Bridge** | 2 mappings (148 & 151) | 2 rows intact in `legacy_user_id_map` | **PASS** |
| **Schema Drift** | 0 unapproved tables/columns | 0 drift detected | **PASS** |

---

## 3. DOMAIN-BY-DOMAIN END-TO-END TRACE

### 3.1 Nutrition Domain Trace

```
Member UI (V3NutritionPage / NutritionLayout.tsx)
  │
  ├── [Read Daily Summary] ──> useNutritionData() hook ──> GET /api/v1/nutrition/daily
  │                                                                 │
  │                                     NutritionController.getDaily()
  │                                                                 │
  │                                     NutritionService.getDailySummary()
  │                                     ├── NutritionRepository.getDailyLogs() ──> public.v2_nutrition_logs
  │                                     └── NutritionRepository.getWaterLogs() ──> public.water_logs
  │
  ├── [Log Meal Modal] ──────> POST /api/v1/nutrition/meals
  │                                     │
  │                                     NutritionController.createMeal()
  │                                     │
  │                                     NutritionService.createMealLog()
  │                                     │
  │                                     NutritionRepository.createNutritionLog() ──> public.v2_nutrition_logs
  │
  └── [Log Water] ────────────> logWater() mutation ──> POST /api/v1/nutrition/water
                                                                    │
                                        NutritionController.addWater()
                                                                    │
                                        NutritionService.addWaterLog()
                                                                    │
                                        NutritionRepository.addWaterLog() ──> public.water_logs (profile_id)
```

#### Nutrition Domain Findings:
- **Canonical Flow (`V3NutritionPage` / `NutritionLayout.tsx`):**
  - Fully wired to canonical V2 routes (`/nutrition/daily`, `/nutrition/meals`, `/nutrition/water`).
  - Supports multiple meals per user per date (`v2_nutrition_logs` has zero uniqueness constraints on date).
  - Macros match canonical schema (`calories`, `protein_g`, `carbs_g`, `fats_g`).
  - Errors are displayed cleanly in the UI (`setLogMealError`) and are never masked with mock fallback data.
- **Legacy Flow (`DashboardPage.tsx` / `dashboard.service.ts`):**
  - Submits meal entries to `/intelligence/nutrition/log` using non-canonical field names (`fat_g`, `water_ml`).
  - Submits hydration to `/intelligence/nutrition/log` with `{ water_ml: amount, source }` instead of `/nutrition/water` with `{ amount_ml: amount }`.
  - The intelligence backend service attempts an `upsert(..., { onConflict: 'user_id,date' })`, which crashes because `v2_nutrition_logs` does not have a unique constraint on `(user_id, date)`.

---

### 3.2 Workout Domain Trace

```
Member UI (V3WorkoutPage / WorkoutLayout.tsx)
  │
  ├── [Workout View Load] ───> useWorkoutData() ──> GET /api/v1/workouts/today
  │                                                           │
  │                               WorkoutController.getToday()
  │                                                           │
  │                               WorkoutExecutionService.getTodayWorkout()
  │                               ├── V2WorkoutSessionRepository.getActiveSession() ──> public.v2_workout_sessions
  │                               └── WorkoutPlanRepository.getPlansForUser()      ──> public.v2_workout_plans
  │
  └── [Complete Set Click] ──> logSet() mutation ──> POST /api/v1/workouts/sets
                                                              │
                                  WorkoutController.logSet()
                                  [REQUIRES sessionId, exercise_id, weight_kg, reps, rpe]
                                                              │
                                  WorkoutExecutionService.logSet()
                                                              │
                                  V2WorkoutSessionRepository.createSet() ──> public.exercise_sets
```

#### Workout Domain Findings:
- **Backend Service & Repository Layer (EXCELLENT):**
  - `WorkoutExecutionService` correctly implements the full state machine (`planned` &rarr; `ready` &rarr; `started` &harr; `paused` &rarr; `completed` / `abandoned` / `cancelled`).
  - `V2WorkoutSessionRepository` enforces single active session lookups and disallows updating terminal sessions.
  - Foreign key cascades (`exercise_sets` &rarr; `v2_workout_sessions` CASCADE; `exercises` SET NULL) operate as designed.
- **Frontend Execution Disconnect (`WorkoutLayout.tsx`):**
  - `handleCompleteSet` calls `logSet` passing `{ exerciseId, weightKg, reps, rpe }`.
  - It does **not** create a workout session via `POST /workouts/sessions/start` nor pass `sessionId`.
  - The backend controller expects `{ sessionId, exercise_id, weight_kg, reps, rpe }`.
  - When `sessionId` is missing, the backend returns a 404/400 error.
  - `WorkoutLayout.tsx` wraps the call in `try { ... } catch { /* Graceful local progression */ }`, swallows the error, and advances the UI locally. The user assumes the set is recorded, but database row count remains 0.

---

### 3.3 TRINETRA AI Integration Trace

```
TRINETRA Runtime (ContextBuilder / TrinetraTools)
  │
  ├── [Context Assembly] ──> ContextBuilder.buildContext(userId)
  │                               ├── WorkoutExecutionService.getTodayWorkout(userId)
  │                               │     └── Reports telemetryStatus.workoutOnline
  │                               └── NutritionService.getDailySummary(userId)
  │                                     └── Reports telemetryStatus.nutritionOnline
  │
  ├── [Tool: get_today_workout] ──> GetTodayWorkoutTool.executeImpl()
  │                                       │
  │                                       WorkoutExecutionService.getTodayWorkout(context.userId)
  │
  └── [Tool: get_nutrition] ─────> GetNutritionTool.executeImpl(input)
                                          │
                                          NutritionService.getDailySummary(context.userId, input.date)
```

#### TRINETRA Findings:
- **Telemetry Observability:** `ContextBuilder` inspects `isSuccess()` on both domain responses. If an error occurs, it sets `telemetryStatus.workoutOnline = false` or `nutritionOnline = false` and formats `[Telemetry Offline - database query failed]`. Valid empty data (0 calories, no active session) is rendered cleanly as `No active workout scheduled` or `0 kcal consumed`.
- **Tenant & Privacy Boundaries:** All tools take `context.userId` from the cryptographically verified JWT context. Cross-user data access is impossible through TRINETRA tools.
- **Fail-Closed Execution:** Both tools propagate domain `AppError` results; neither tool invents mock data on query failures.

---

### 3.4 Analytics Domain Trace

- `AnalyticsRepository` queries:
  - `v2_workout_sessions` for user workouts in range (`getWorkoutSessionsForUsers`).
  - `exercise_sets` for session sets in range (`getExerciseSetsForSessions`).
  - `v2_nutrition_logs` for member meals in range (`getNutritionLogsForUsers`).
  - `profiles` scoped to `organization_id` for tenant membership (`getOrgMemberIds`).
- `AdminRepository` queries:
  - `v2_workout_plans` scoped by `organization_id` for tenant dashboard counts.
  - `v2_workout_sessions` for platform super-admin dashboard counts.
- **Tenant Isolation:** All organization analytics queries strictly filter by `in('user_id', userIds)` where `userIds` is derived from `profiles.organization_id = organizationId`.

---

## 4. INVENTORY OF REMAINING LEGACY QUERIES

| File Location | Query / Reference | Purpose / Status | Remediation Required |
| :--- | :--- | :--- | :--- |
| `backend/src/modules/workout/repositories/LegacyWorkoutSessionRepository.ts` | `.from('workout_sessions')`<br>`.from('workout_events')` | Dead legacy file; not imported anywhere in active application code. | Safe to deprecate and delete in cleanup phase. |
| `backend/src/modules/identity/repositories/IdentityRepository.ts` (lines 138–141) | `.from('workout_plans').delete()`<br>`.from('workout_sessions').delete()`<br>`.from('workout_logs').delete()` | `resetDemoData()` batch cleanup for demo accounts. Missing `v2_workout_plans`, `v2_workout_sessions`, `v2_nutrition_logs`. | Update `resetDemoData()` to include modern V2 tables. |
| `backend/src/modules/intelligence/repositories/NutritionRepository.ts` (line 17) | `.from('v2_nutrition_logs').upsert(..., { onConflict: 'user_id,date' })` | Used by `/intelligence/nutrition/log`. Invalid upsert on non-unique constraint. | Redirect route to canonical `NutritionService` or remove legacy upsert. |
| `src/api/workoutApi.ts` (lines 17–25) | `getTodayWorkout: () => httpClient.get('/workouts/programs')`<br>`getHistory: () => httpClient.get('/workouts/programs')`<br>`getPlans: () => httpClient.get('/workouts/programs')` | Legacy aliases stubbed to prevent crashes. Point to wrong endpoints. | Update aliases to canonical endpoints: `/workouts/today`, `/workouts/history`, `/workouts/plans`. |
| `src/features/dashboard/services/dashboard.service.ts` (lines 96, 105) | `httpClient.post('/intelligence/nutrition/log', ...)` | Legacy dashboard meal & water entry. | Point to `/nutrition/meals` and `/nutrition/water`. |

---

## 5. TEST EXECUTION & RESULTS

### 5.1 Workspace Compilation & Type Checks
```bash
npm run build
```
- **Frontend Vite Build:** `✓ 3240 modules transformed` &rarr; `dist/` bundle created with zero TypeScript or bundling errors.
- **Backend Build (`tsc && tsc-alias`):** Compiled cleanly with zero diagnostic errors.

### 5.2 Isolated Behavioral & Security Suites (Disposable PostgreSQL 18)
Executed against local disposable PostgreSQL 18 (`127.0.0.1:5433`):

```bash
# 1. DB-4 Integration Test Suite
npx vitest run tests/integration/db4_real_postgres.integration.test.ts
✓ 15 tests passed (1968ms)

# 2. Phase 10B Readiness Suite
node scratch/test_phase10b_readiness.cjs
✓ 5 tests passed (100% clean)

# 3. DB-4K Integration Edge-Cases Suite
node scratch/test_db4k_integration_edge_cases.cjs
✓ 4 tests passed (Multiple meals per date, hydration identity, lifecycle conflicts, cascade sets)

# 4. Security & Tenant Isolation Suites
npx vitest run tests/security/cross_user_isolation.security.test.ts
✓ 10 tests passed (68ms)

npx vitest run tests/security/phase5_domain_apis.security.test.ts
✓ 19 tests passed (84ms)

# 5. TRINETRA Runtime & Dashboard Resilience Suites
npx vitest run tests/unit/trinetra_runtime.unit.test.ts tests/unit/member_dashboard_resilience.unit.test.ts
✓ 13 tests passed (45ms)
```

**Total Automated Tests Passed:** **66 / 66** across unit, security, integration, and edge-case suites.

---

## 6. STAGING SAFETY BOUNDARY

In compliance with strict safety directives:
- **Zero remote mutations** were performed on staging during this audit.
- Verification of staging was strictly limited to read-only SQL queries and catalog introspection.
- **Unperformed Staging Checks:** Behavioral write tests (e.g. creating real workout sessions, logging live exercise sets, triggering unique index collisions on active sessions) were **NOT** executed on live staging to prevent polluting staging data or triggering unapproved DML. These behaviors were validated 100% on disposable PostgreSQL 18.

---

## 7. INTEGRATION DEFECTS RANKED BY SEVERITY

### [DEFECT-1] CRITICAL (Severity: HIGH)
- **Title:** `WorkoutLayout.tsx` Silent Set Logging Failure (Missing Session ID & CamelCase Payload)
- **Impact:** Athletes clicking "Complete Set" experience UI advancement (set counter increments, rest timer starts), but zero sets are recorded in the database.
- **Root Cause:**
  1. `WorkoutLayout` does not call `POST /workouts/sessions/start` to obtain a session UUID.
  2. `useWorkoutData.logSet` transmits `{ exerciseId, weightKg, reps, rpe }` without `sessionId`.
  3. `WorkoutController.logSet` rejects the payload due to missing `sessionId`.
  4. `WorkoutLayout` swallows the rejection in an empty `catch` block.

### [DEFECT-2] CRITICAL (Severity: HIGH)
- **Title:** `DashboardPage.tsx` Meal & Water Logging Submits to Broken Upsert Route
- **Impact:** Submitting meal or water logs from the Member Dashboard modal fails with database error `42P10 (no unique or exclusion constraint matching ON CONFLICT specification)`.
- **Root Cause:**
  1. `DashboardPage.tsx` posts to `/intelligence/nutrition/log`.
  2. The intelligence service attempts `.upsert(payload, { onConflict: 'user_id,date' })` on `v2_nutrition_logs`.
  3. `v2_nutrition_logs` has no unique constraint on `(user_id, date)` by design.
  4. Form payload uses `fat_g` instead of `fats_g`, and mixes `water_ml` into the meal payload.

### [DEFECT-3] MODERATE (Severity: MEDIUM)
- **Title:** `src/api/workoutApi.ts` Legacy Helper Endpoints Mapped to `/workouts/programs`
- **Impact:** Components or legacy hooks using `workoutApi.getTodayWorkout()`, `workoutApi.getHistory()`, or `workoutApi.getPlans()` fetch published gym programs rather than member workout execution records.
- **Root Cause:** Outdated placeholder aliases kept in `workoutApi.ts` were never redirected to `/workouts/today`, `/workouts/history`, and `/workouts/plans`.

### [DEFECT-4] MINOR (Severity: LOW)
- **Title:** `IdentityRepository.resetDemoData` Incomplete Cleanup
- **Impact:** Triggering demo data reset for a test account clears legacy tables but leaves modern `v2_workout_plans`, `v2_workout_sessions`, and `v2_nutrition_logs` rows intact.
- **Root Cause:** Batch `Promise.all` in `IdentityRepository.ts` lacks delete calls for the V2 domain tables.

### [DEFECT-5] INFORMATIONAL (Severity: LOW)
- **Title:** Dead Code Repositories Remaining in Codebase
- **Impact:** Minor cognitive overhead; risk of accidental import.
- **Root Cause:** `LegacyWorkoutSessionRepository.ts` is unreferenced; `modules/intelligence/repositories/NutritionRepository.ts` is a legacy duplicate.

---

## 8. PRIORITIZED REMEDIATION ROADMAP

The following prioritized fixes are recommended for authorization in a subsequent implementation task:

1. **Remediation 1 (Workout Session & Set Wiring):**
   - Update `useWorkoutData()` in `src/hooks/useStrivaApi.ts` to support `startSession`, `activeSession`, and snake_case `logSet` payload with `sessionId`.
   - Update `WorkoutLayout.tsx` to automatically start or attach to an active session, pass `sessionId` to `logSet`, and display an error toast/banner if set persistence fails rather than swallowing the error.
2. **Remediation 2 (Dashboard Meal & Hydration Wiring):**
   - Update `DashboardPage.tsx` and `dashboard.service.ts` to call canonical endpoints:
     - Meals &rarr; `POST /api/v1/nutrition/meals` with `{ food_name, calories, protein_g, carbs_g, fats_g, meal_type }`.
     - Hydration &rarr; `POST /api/v1/nutrition/water` with `{ amount_ml }`.
   - Deprecate or align the legacy `/intelligence/nutrition/log` handler.
3. **Remediation 3 (API Contract Alignment):**
   - Align `src/api/workoutApi.ts` aliases to point to canonical V2 endpoints:
     - `getTodayWorkout` &rarr; `GET /workouts/today`
     - `getHistory` &rarr; `GET /workouts/history`
     - `getPlans` &rarr; `GET /workouts/plans`
4. **Remediation 4 (Demo Cleanup Hardening):**
   - Add `v2_workout_sessions`, `v2_workout_plans`, and `v2_nutrition_logs` to `IdentityRepository.resetDemoData()`.

---

## 9. HALT CONDITION MET

In accordance with safety instructions:
- **No code fixes or database mutations were performed during this audit.**
- **DB-5 has NOT been started.**
- **Production remains completely untouched.**
- Execution is halted awaiting operator review of the audit findings.
