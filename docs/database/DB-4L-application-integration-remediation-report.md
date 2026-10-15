# STRIVA V2 — DB-4L: Application Integration Remediation Report

**Date:** 2026-10-12  
**Target Architecture:** STRIVA V2 (Canonical Nutrition & Workout Integration)  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi` (Untouched, 25 migrations)  
**Execution Environment:** Isolated Disposable PostgreSQL 18 (`127.0.0.1:5433`)  
**Final Status:** **PASS**

---

## 1. Executive Summary

This report documents the resolution of the four critical application integration defects identified in `DB-4K-post-migration-integration-audit.md`. All remediations target STRIVA V2 canonical models, removing broken legacy upserts, silent fallbacks, unmapped endpoints, and unisolated demo data deletion.

### Core Guarantees & Boundaries
- **Remote Staging Mutations:** **0** (No remote DDL, DML, or queries executed against `ymrblyiwohvxptiqjfsi`).
- **Database Migrations Added:** **0** (Existing 25 migrations baseline preserved exactly).
- **Silent Fallbacks & Mock Data:** **Eliminated** across member workout, nutrition, progress, and dashboard handlers.
- **Verification:** 100% full workspace build succeeded (`build:frontend` & `build:backend`); all focused regression unit tests and disposable PostgreSQL 18 integration tests passed.

---

## 2. Remediated Defects & Implementation Details

### Remediation 1: Workout Session Lifecycle & Set Persistence [HIGH]

#### Original Defect Behavior
- `WorkoutLayout.tsx` generated mock sets locally and caught API errors silently in an empty `catch` block (`// Graceful local progression`).
- The UI advanced set numbers and entered rest periods optimistically before server confirmation, fabricating completion even when requests failed.
- Outgoing requests failed to supply `sessionId` or used mismatched `camelCase` keys (`exerciseId`, `weightKg`) instead of backend's expected `snake_case` schema (`sessionId`, `exercise_id`, `weight_kg`, `reps`, `rpe`).
- Terminal workout sessions (`completed`, `cancelled`, `abandoned`) lacked state validation in set logging.

#### Implemented Fix
1. **`src/hooks/useStrivaApi.ts` (`useWorkoutData`)**:
   - Added canonical session lifecycle methods: `startSession`, `logSet`, and `completeSession`.
   - `logSet` maps incoming parameters to canonical schema: `{ sessionId, exercise_id, weight_kg, reps, rpe }`.
   - Removed all mock fallback catch blocks; network and API failures propagate cleanly.
2. **`src/design-system/workout/ActiveTrainingView.tsx`**:
   - Added `isSavingSet?: boolean` and `persistenceError?: string | null` props.
   - Renders a prominent visual error banner when persistence fails.
   - Disables submit buttons and shows loading spinners during in-flight network requests to prevent duplicate submissions.
3. **`src/design-system/workout/WorkoutLayout.tsx`**:
   - Obtains active session or starts a session via `startSession({ title })`.
   - Supplies verified `sessionId` with every set logging call.
   - Removed empty `catch` block; UI advances only after server returns successful HTTP response.
   - On persistence failure, retains the set in an uncompleted, retryable state and displays the error message.
   - Marks session `completed` on backend upon finishing all exercises.
4. **`backend/src/modules/workout/services/WorkoutExecutionService.ts`**:
   - Enforced lifecycle state check in `logSet`: rejects set additions to terminal sessions (`completed`, `cancelled`, `abandoned`) with `ValidationError(400)`.

---

### Remediation 2: Dashboard Meal and Hydration Logging [HIGH]

#### Original Defect Behavior
- `DashboardPage.tsx` routed nutrition logging to legacy `/intelligence/nutrition/log`.
- `backend/src/modules/intelligence/repositories/NutritionRepository.ts` executed `.upsert(..., { onConflict: 'user_id,date' })` against `v2_nutrition_logs`. Because `v2_nutrition_logs` intentionally lacks a unique constraint on `(user_id, date)` to support multiple meals per day, PostgREST threw PostgreSQL error `42P10` (`no unique or exclusion constraint matching the ON CONFLICT specification`).
- `dashboard.service.ts` water methods (`addWater`, `fetchTodayWater`) were unaligned with canonical nutrition endpoints.

#### Implemented Fix
1. **`src/features/dashboard/pages/DashboardPage.tsx`**:
   - Rerouted meal creation to canonical endpoint `POST /nutrition/meals` with `{ food_name, meal_type: 'snack', calories, protein_g, carbs_g, fats_g }`.
   - Rerouted hydration logging to canonical endpoint `POST /nutrition/water` with `{ amount_ml }`.
   - Preserves offline queueing to canonical endpoints (`/api/v1/nutrition/meals` and `/api/v1/nutrition/water`).
2. **`src/features/dashboard/services/dashboard.service.ts`**:
   - Updated `addWater` to `POST /nutrition/water` with `{ amount_ml: amount }`.
   - Updated `fetchTodayWater` to `GET /nutrition/daily` and mapped `totalWaterMl` to dashboard water summary.
3. **`backend/src/modules/intelligence/repositories/NutritionRepository.ts`**:
   - Removed incompatible `.upsert(..., { onConflict: 'user_id,date' })`.
   - Replaced with `.insert()` into `v2_nutrition_logs` (supporting multiple distinct meals per date).
   - Writes hydration to `water_logs` using canonical `profile_id: userId`.
4. **`backend/src/modules/intelligence/services/NutritionService.ts`**:
   - Fixed calorie fallback summation (`log.calories ?? log.calories_consumed ?? 0`).

---

### Remediation 3: Workout API Helper Alignment [MEDIUM]

#### Original Defect Behavior
- `src/api/workoutApi.ts` mapped member execution methods (`getTodayWorkout`, `getHistory`, `getPlans`) to gym program-template endpoint `/workouts/programs`.
- Member execution was conflated with trainer template definitions.

#### Implemented Fix
1. **`src/api/workoutApi.ts`**:
   - `getTodayWorkout()` maps to canonical `GET /workouts/today`.
   - `getHistory()` maps to canonical `GET /workouts/history`.
   - `getPlans(params)` maps to canonical `GET /workouts/plans`.
   - Preserved `getPrograms` strictly for gym program-template catalog queries.
   - Retained `logSet` and backward-compatible `logProgress` mapping to `POST /workouts/sets`.
   - Removed all mock fallback returns; propagates errors directly through Axios interceptors.

---

### Remediation 4: Demo Data Reset Hardening [LOW]

#### Original Defect Behavior
- `backend/src/modules/identity/repositories/IdentityRepository.ts` only deleted legacy tables during `resetDemoData(userId)`.
- Modern V2 demo records in `v2_workout_sessions`, `exercise_sets`, `v2_workout_plans`, and `v2_nutrition_logs` remained orphaned.
- Risk of foreign key constraint violations if parent sessions were deleted before child `exercise_sets`.

#### Implemented Fix
1. **`backend/src/modules/identity/repositories/IdentityRepository.ts` (`resetDemoData`)**:
   - Step 1: Queries `v2_workout_sessions` for the target `userId` and deletes child `exercise_sets` first using `in('session_id', sessionIds)`.
   - Step 2: Deletes parent records in `v2_workout_sessions`, `v2_workout_plans`, `v2_nutrition_logs` scoped to `eq('user_id', userId)`, and `water_logs` scoped to `eq('profile_id', userId)`.
   - Step 3: Retains scoped legacy cleanup for backward compatibility.
   - Strict tenant and member boundary: All queries are strictly scoped to `userId`; legitimate members' records are completely untouched.

---

## 3. Dead-Code Review

The audit identified two potential dead-code repositories:
1. **`backend/src/modules/workout/repositories/LegacyWorkoutSessionRepository.ts`**:
   - **Inspection**: Zero imports or references in active application routing (`server.ts`, `workout.routes.ts`, `WorkoutController.ts`). Replaced by `V2WorkoutSessionRepository.ts`.
   - **Action**: Per STRIVA Rule 19 ("Safe Legacy Deprecation"), the file was annotated with an explicit `@deprecated` JSDoc header documenting `V2WorkoutSessionRepository` as the canonical replacement. Retained safely without deletion.
2. **`backend/src/modules/intelligence/repositories/NutritionRepository.ts`**:
   - **Inspection**: Referenced by `IntelligenceService`. Acts as secondary nutrition adapter for Trinetra intelligence logs.
   - **Action**: Annotated with `@deprecated` JSDoc distinguishing it from canonical domain repository `backend/src/modules/nutrition/repositories/NutritionRepository.ts`. Updated internal operations to modern `v2_nutrition_logs` `.insert()` and `water_logs`.

---

## 4. Regression Tests & Verification Results

### A. Full Workspace Build
```bash
npm run build
```
- **Frontend (`vite build`)**: **PASS** (3,240 modules transformed, 0 errors, gzip 296 kB).
- **Backend (`tsc && tsc-alias`)**: **PASS** (TypeScript compilation 0 errors).

### B. Unit & Regression Test Suite
```bash
npx vitest run tests/unit/db4l_remediation_regression.unit.test.ts
```
**Results: 15 passed (15 total)**
- `ensures set persistence request includes sessionId and snake_case contract keys`: **PASS**
- `rejects adding sets to terminal sessions (completed, cancelled, abandoned)`: **PASS**
- `prevents optimistic advance on server failure; keeps set in retryable state`: **PASS**
- `successful retry completes persistence and advances UI state without duplication`: **PASS**
- `routes dashboard water addition to canonical POST /nutrition/water`: **PASS**
- `routes dashboard today water query to canonical GET /nutrition/daily`: **PASS**
- `creates multiple meals independently on the same date without upsert conflict`: **PASS**
- `propagates API error visibly to user without fabricating success`: **PASS**
- `maps getTodayWorkout to GET /workouts/today`: **PASS**
- `maps getHistory to GET /workouts/history`: **PASS**
- `maps getPlans to GET /workouts/plans with query params`: **PASS**
- `propagates API error when getTodayWorkout fails (no silent fallback)`: **PASS**
- `handles empty results cleanly from canonical endpoints`: **PASS**
- `deletes records strictly scoped to target user ID in dependency-safe order`: **PASS**
- `returns failure when a database error occurs during reset`: **PASS**

### C. Isolated Real PostgreSQL 18 Integration Suite
```bash
npx vitest run tests/integration/db4l_real_postgres_remediation.integration.test.ts
```
**Results: 3 passed (3 total on 127.0.0.1:5433)**
- `allows multiple meals on the same date for the same member without upsert/unique violation`: **PASS** (3 meals logged independently on `2026-10-12`; verified real `v2_daily_nutrition_summary` view aggregates all 3 meals).
- `resets demo data cleanly in dependency order while leaving other member data untouched`: **PASS** (Seeded demo and legitimate member records; executed demo reset; verified 0 demo records remain; verified 100% of legitimate member plans, sessions, exercise sets, nutrition, and water records remain intact).
- `enforces single active workout session per user via partial unique index`: **PASS** (Starting second active session violates `23505`; completing session permits starting next session).

### D. Existing Security & Contract Suites
- `backend/tests/security/cross_user_isolation.security.test.ts`: **10 passed (10 total)**
- `backend/tests/security/phase5_domain_apis.security.test.ts`: **19 passed (19 total)**
- `backend/tests/unit/db4_nutrition_workout_contracts.unit.test.ts`: **9 passed (9 total)**
- `backend/tests/integration/db4_real_postgres.integration.test.ts`: **15 passed (15 total)**

---

## 5. Summary of Files Changed

| File Path | Description of Change |
| :--- | :--- |
| `src/hooks/useStrivaApi.ts` | Added `startSession`, `logSet` (mapping snake_case schema), `completeSession`. Removed mock fallback catches across member data hooks. |
| `src/design-system/workout/ActiveTrainingView.tsx` | Added `isSavingSet`, `persistenceError`, visual error alert, and in-flight button disabling. |
| `src/design-system/workout/WorkoutLayout.tsx` | Binds to active session ID; passes `sessionId` to `logSet`; removed empty catch; advances UI only on server confirmation; retains retryable state on failure. |
| `src/features/dashboard/pages/DashboardPage.tsx` | Rerouted meal logging to `POST /nutrition/meals` and water to `POST /nutrition/water`. |
| `src/features/dashboard/services/dashboard.service.ts` | Rerouted water methods to `/nutrition/water` and `/nutrition/daily`. |
| `backend/src/modules/intelligence/repositories/NutritionRepository.ts` | Removed broken `.upsert(..., { onConflict: 'user_id,date' })`; replaced with `.insert()`. Added deprecation notice. |
| `backend/src/modules/intelligence/services/NutritionService.ts` | Fixed calorie fallback aggregation in daily summary. |
| `src/api/workoutApi.ts` | Mapped `getTodayWorkout`, `getHistory`, and `getPlans` to canonical `/workouts/*` endpoints. Preserved `logProgress` compatibility. |
| `backend/src/modules/identity/repositories/IdentityRepository.ts` | Hardened `resetDemoData`: deletes child `exercise_sets`, then modern V2 records strictly scoped to target `userId`. |
| `backend/src/modules/workout/repositories/LegacyWorkoutSessionRepository.ts` | Added `@deprecated` JSDoc documenting `V2WorkoutSessionRepository` canonical replacement. |
| `backend/src/modules/workout/services/WorkoutExecutionService.ts` | Enforced terminal session check in `logSet` to prevent set addition to closed sessions. |
| `backend/tests/unit/db4l_remediation_regression.unit.test.ts` | Added 15 comprehensive unit regression tests covering all 4 remediations. |
| `backend/tests/integration/db4l_real_postgres_remediation.integration.test.ts` | Added 3 real PostgreSQL 18 tests verifying multi-meal insertion, demo reset dependency ordering, and cross-member isolation. |

---

## 6. Safety Affirmation & Final Status

- **Remote Database Mutations:** **NONE**. All test executions targeted local disposable PostgreSQL 18 on port 5433.
- **Migration & Schema Alterations:** **NONE**. Staging migration baseline remains at exactly 25 migrations.
- **Final Remediation Status:** **PASS**.

**Halt condition satisfied.** Awaiting user review before proceeding to subsequent phases.
