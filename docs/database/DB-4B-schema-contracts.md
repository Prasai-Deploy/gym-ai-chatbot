# STRIVA V2 — DB-4B: Nutrition and Workout Schema Contract Finalization

## Executive Summary & Engineering Boundary

This document formalizes the canonical database, API, repository, identity, and security contracts for the **Nutrition** and **Workout** domains in STRIVA V2 before any migration files are generated or applied.

### Operational Context
- **Target Staging Environment**: Supabase Project Reference `ymrblyiwohvxptiqjfsi` (PostgreSQL 15.8)
- **Active Preceding Migration**: `phase_9b_legacy_identity_bridge.sql` (Phase 9B identity bridge, deployed and verified on staging)
- **Phase 9B Status**: **Deployed, verified, and strictly unchanged.**
- **DB-4 Migration Status**: **Contract Finalization Phase (DB-4B).** Zero remote DDL, DML, backfills, or policy modifications have been executed. No migrations are applied during this phase.

---

## 1. Verified Identity Model & Security Context

### 1.1 Application User Identity Resolution
Based on the code inspection of `backend/src/middleware/auth.ts`, `backend/src/middleware/auth.middleware.ts`, and PostgreSQL migration history (`001_identity_domain.sql`, `008_multi_tenant_saas_foundation.sql`, `phase_9b_legacy_identity_bridge.sql`):

1. **Identity Equality**:
   - In STRIVA V2, the authenticated user identifier from Supabase Auth (`auth.users.id`) is **identical** to the primary key of the canonical user profile in the public schema (`public.profiles.id`).
   - The auth middleware derives `req.user` directly from `supabase.auth.getUser(token)`:
     ```typescript
     // backend/src/middleware/auth.middleware.ts
     const { data: { user }, error } = await supabase.auth.getUser(token);
     req.user = user; // user.id is UUID
     ```
   - In PostgreSQL, PostgREST evaluates `auth.uid()`, which returns the exact same JWT subject claim (`sub`), equal to both `auth.users.id` and `public.profiles.id`.

2. **Foreign Key Target Rule**:
   - Every modern application table in STRIVA V2 storing member data references **`public.profiles(id)`** with `ON DELETE CASCADE`.
   - **Verification**: Verified across all existing V2 foundation migrations:
     - `v2_fitness_profiles.id REFERENCES public.profiles(id)`
     - `legacy_user_id_map.profile_id REFERENCES public.profiles(id)`
     - `water_logs.profile_id REFERENCES public.profiles(id)`
     - `organization_staff.user_id REFERENCES public.profiles(id)`
     - `organization_members.user_id REFERENCES public.profiles(id)`
     - `trainer_assignments.member_user_id REFERENCES public.profiles(id)`
   - **Mandatory DB-4 Standard**: All new domain tables (`v2_nutrition_logs`, `v2_workout_plans`, `v2_workout_sessions`) must explicitly declare:
     ```sql
     user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
     ```

3. **Legacy Integer ID Resolution**:
   - For legacy accounts (e.g. legacy IDs 148 and 151), the identity mapping is established exclusively through `public.legacy_user_id_map` (`legacy_integer_id INT, profile_id UUID`).
   - Modern domain tables never use integer `user_id`. They bind directly to `public.profiles.id`.

### 1.2 Tenant & Role Authorization Model

1. **Member Self-Access**:
   - Enforced by PostgreSQL RLS predicates: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
   - Members can only read, insert, update, and delete their own records. Spoofing another member's UUID fails at the RLS layer.

2. **Organization Tenant Isolation (Gym Owners & Staff)**:
   - Evaluated via canonical SECURITY DEFINER helper functions established in Phase 8B and Phase 9A:
     - `public.is_org_member(target_org_id UUID)`: Authorizes any verified staff member or owner of the organization.
     - `public.is_org_manager(target_org_id UUID)`: Authorizes owners, gym managers, and platform super admins without RLS recursion.
   - For tenant-owned records (e.g. workout plans or sessions with an `organization_id`), staff access is permitted strictly via:
     ```sql
     (organization_id IS NOT NULL AND public.is_org_member(organization_id))
     ```
   - Never trust client-supplied headers such as `x-organization-id` or request body params. Authorization is always resolved server-side from JWT claims and database membership tables.

3. **Service-Role vs Authenticated-User Execution Boundary**:
   - Backend services utilize two distinct clients:
     - `supabaseClient` (scoped to user JWT): Subject to all RLS policies.
     - `supabaseAdmin` (instantiated with `SUPABASE_SERVICE_ROLE_KEY`): Bypasses PostgreSQL RLS (`BYPASSRLS`).
   - Repository business logic must continue to enforce user scoping (`.eq('user_id', userId)`) even when executing through `supabaseAdmin`, ensuring defense-in-depth across the API and DB layers.

---

## 2. Finalized Nutrition Schema & API Contract

### 2.1 Domain Architecture: Individual Meal Entries
To resolve the conflict between the meal logging UI and the draft daily aggregate schema:
- **Contract Principle**: **One row per meal or food-log entry.** Multiple entries per user per day are explicitly supported.
- **Strict Prohibition**: **No daily uniqueness constraint (`UNIQUE (user_id, date)`) will be created.**
- **Daily Summaries**: Handled dynamically in `NutritionService.getDailySummary()` and supported by an additive database view `public.v2_daily_nutrition_summary`.

### 2.2 Table Specification: `public.v2_nutrition_logs`

```sql
CREATE TABLE IF NOT EXISTS public.v2_nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type VARCHAR(32) NOT NULL DEFAULT 'snack' 
        CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name TEXT NOT NULL CHECK (char_length(trim(food_name)) >= 1),
    calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0 AND calories <= 20000),
    protein_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (protein_g >= 0.00 AND protein_g <= 1000.00),
    carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (carbs_g >= 0.00 AND carbs_g <= 1000.00),
    fats_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (fats_g >= 0.00 AND fats_g <= 1000.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_user_date 
    ON public.v2_nutrition_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_user_created 
    ON public.v2_nutrition_logs(user_id, created_at DESC);
```

### 2.3 Additive View Specification: `public.v2_daily_nutrition_summary`

```sql
CREATE OR REPLACE VIEW public.v2_daily_nutrition_summary AS
SELECT 
    user_id,
    date,
    SUM(calories)::INTEGER AS total_calories,
    ROUND(SUM(protein_g), 2)::NUMERIC(8,2) AS total_protein_g,
    ROUND(SUM(carbs_g), 2)::NUMERIC(8,2) AS total_carbs_g,
    ROUND(SUM(fats_g), 2)::NUMERIC(8,2) AS total_fats_g,
    COUNT(id)::INTEGER AS meal_count,
    MIN(created_at) AS first_logged_at,
    MAX(created_at) AS last_logged_at
FROM public.v2_nutrition_logs
GROUP BY user_id, date;
```

### 2.4 Hydration Telemetry Alignment (Phase 9B Preservation)
1. **Existing Staging Table**: `public.water_logs` (13 baseline rows preserved).
2. **Phase 9B Bridge Columns**:
   - `profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
   - `amount_ml INT`
   - `user_id` constraint: `DROP NOT NULL` executed in Phase 9B.
3. **Repository Correction**:
   - In `NutritionRepository.ts`:
     - Update `getWaterLogs(userId, dateStr)`: Query `.eq('profile_id', userId)` (never `.eq('user_id', userId)`).
     - Update `addWaterLog(userId, dto)`: Insert `{ profile_id: userId, amount_ml: dto.amount_ml }`.
     - The Phase 9B trigger `sync_water_logs_compatibility()` will automatically resolve legacy `user_id` if the user is mapped in `legacy_user_id_map`.
     - Unmapped V2 members successfully record hydration without violating integer constraints.

### 2.5 API & DTO Contract

| Endpoint | Method | Input DTO | Response DTO | Behavior |
| :--- | :---: | :--- | :--- | :--- |
| `/api/v1/nutrition/daily` | `GET` | Query: `?date=YYYY-MM-DD` | `DailySummaryResponse` | Aggregates individual meals + water logs for target date. Defaults to current date. |
| `/api/v1/nutrition/meals` | `POST` | `CreateNutritionLogDTO` | `NutritionLogRecord` | Inserts a meal entry. Allows unlimited meals per day. |
| `/api/v1/nutrition/meals/:id` | `PATCH` | `UpdateNutritionLogDTO` | `NutritionLogRecord` | Updates meal name, calories, macros, notes. Scoped to `user_id = auth.uid()`. |
| `/api/v1/nutrition/meals/:id` | `DELETE` | Path param `:id` | `{ success: true }` | Hard-deletes meal entry. Scoped to `user_id = auth.uid()`. |
| `/api/v1/nutrition/water` | `GET` | Query: `?date=YYYY-MM-DD` | `WaterLogRecord[]` | Retrieves water logs filtering on `profile_id = auth.uid()`. |
| `/api/v1/nutrition/water` | `POST` | `AddWaterLogDTO` | `WaterLogRecord` | Inserts water log with `profile_id = auth.uid()`. |

---

## 3. Finalized Workout Schema & Lifecycle Contract

### 3.1 Workout Plans Contract
- **Problem in Staging**: Staging `workout_plans` is a legacy table with integer PK, integer `user_id`, and mandatory `date DATE NOT NULL` and `exercises JSONB NOT NULL`. It has 0 rows.
- **Resolution**: Introduce canonical **`public.v2_workout_plans`** with UUID PK, UUID `user_id`, optional tenant scoping (`organization_id`), and flexible multi-day schedule JSONB. Legacy `workout_plans` remains untouched.

```sql
CREATE TABLE IF NOT EXISTS public.v2_workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Workout Plan',
    description TEXT,
    schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_workout_plans_user 
    ON public.v2_workout_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_v2_workout_plans_org 
    ON public.v2_workout_plans(organization_id);
```

### 3.2 Workout Session Lifecycle & State Machine
The session lifecycle follows an explicit state machine managed by `WorkoutExecutionService`:

```
                 ┌───────────────┐
                 │    planned    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │     ready     │
                 └───────┬───────┘
                         │
                         ▼
        ┌───────────► started ◄──────────┐
        │                │               │
        │                ▼               │
        │        ┌───────────────┐       │
        └────────┤    paused     ├───────┘
                 └───────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ completed │   │ abandoned │   │ cancelled │
   └───────────┘   └───────────┘   └───────────┘
   (TERMINAL)      (TERMINAL)      (TERMINAL)
```

- **Transitions**:
  - `startSession`: Sets state to `started`, records `started_at = now()`.
  - `transitionState('paused')`: Sets state to `paused`.
  - `transitionState('completed')`: Records `completed_at = now()`.
  - `transitionState('abandoned')` / `transitionState('cancelled')`: Records `completed_at = now()`.
- **Invariants**:
  - Closed sessions (`completed`, `abandoned`, `cancelled`) cannot be transitioned again (`ValidationError: Cannot transition a closed session`).
  - Active session uniqueness: At most one session per user may have `state IN ('started', 'paused')`.

### 3.3 Table Specification: `public.v2_workout_sessions`

```sql
CREATE TABLE IF NOT EXISTS public.v2_workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.v2_workout_plans(id) ON DELETE SET NULL,
    day_id VARCHAR(64),
    title VARCHAR(255) NOT NULL DEFAULT 'Workout Session',
    state VARCHAR(32) NOT NULL DEFAULT 'started'
        CHECK (state IN ('planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_user_state 
    ON public.v2_workout_sessions(user_id, state);
CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_started 
    ON public.v2_workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_org 
    ON public.v2_workout_sessions(organization_id);

-- Enforce at most one active session per member
CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_workout_sessions_single_active
    ON public.v2_workout_sessions(user_id)
    WHERE state IN ('started', 'paused');
```

### 3.4 Table Specification: `public.exercise_sets`

```sql
CREATE TABLE IF NOT EXISTS public.exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.v2_workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    set_number INTEGER NOT NULL DEFAULT 1 CHECK (set_number >= 1),
    weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (weight_kg >= 0.00 AND weight_kg <= 1000.00),
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0 AND reps <= 1000),
    rpe NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1.0 AND rpe <= 10.0)),
    tempo VARCHAR(32),
    rest_time_seconds INTEGER CHECK (rest_time_seconds IS NULL OR rest_time_seconds >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'completed' 
        CHECK (status IN ('planned', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_session 
    ON public.exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise 
    ON public.exercise_sets(exercise_id);
```

### 3.5 Dependency Resolution: `exercise_sessions` and `workout_events`
- **`exercise_sessions`**:
  - *Finding*: Only appeared in an unused draft query in `AnalyticsRepository.ts`. In V2, `exercise_sets` links directly to `session_id` and `exercise_id`.
  - *Decision*: **Deferred and omitted.** Inserting an intermediate table adds redundant overhead without serving any frontend or AI requirement.
- **`workout_events`**:
  - *Finding*: Only referenced in `LegacyWorkoutSessionRepository.ts`, which is inactive. V2 uses in-memory `eventBus` publishing.
  - *Decision*: **Deferred.** Append-only DB ledger is not required by current contracts.

---

## 4. RLS and Tenant Isolation Matrix

Every proposed table enables PostgreSQL Row Level Security (`rowsecurity = true`) and defines explicit policies for authenticated members and organization staff.

| Table Name | Operation | Target Role | Policy Name | Predicate Expression |
| :--- | :---: | :--- | :--- | :--- |
| `v2_nutrition_logs` | `SELECT` | `authenticated` | `v2_nutrition_member_select` | `auth.uid() = user_id` |
| `v2_nutrition_logs` | `INSERT` | `authenticated` | `v2_nutrition_member_insert` | `WITH CHECK (auth.uid() = user_id)` |
| `v2_nutrition_logs` | `UPDATE` | `authenticated` | `v2_nutrition_member_update` | `auth.uid() = user_id WITH CHECK (auth.uid() = user_id)` |
| `v2_nutrition_logs` | `DELETE` | `authenticated` | `v2_nutrition_member_delete` | `auth.uid() = user_id` |
| `v2_workout_plans` | `SELECT` | `authenticated` | `v2_workout_plans_read` | `auth.uid() = user_id OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))` |
| `v2_workout_plans` | `INSERT` | `authenticated` | `v2_workout_plans_insert` | `WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_plans` | `UPDATE` | `authenticated` | `v2_workout_plans_update` | `auth.uid() = user_id WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_plans` | `DELETE` | `authenticated` | `v2_workout_plans_delete` | `auth.uid() = user_id` |
| `v2_workout_sessions` | `SELECT` | `authenticated` | `v2_workout_sessions_read` | `auth.uid() = user_id OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))` |
| `v2_workout_sessions` | `INSERT` | `authenticated` | `v2_workout_sessions_insert` | `WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_sessions` | `UPDATE` | `authenticated` | `v2_workout_sessions_update` | `auth.uid() = user_id WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_sessions` | `DELETE` | `authenticated` | `v2_workout_sessions_delete` | `auth.uid() = user_id` |
| `exercise_sets` | `ALL` | `authenticated` | `exercise_sets_session_scope` | `EXISTS (SELECT 1 FROM public.v2_workout_sessions s WHERE s.id = exercise_sets.session_id AND (s.user_id = auth.uid() OR (s.organization_id IS NOT NULL AND public.is_org_member(s.organization_id))))` |
| All Tables | `ALL` | `service_role` | Default Supabase Grant | Bypass RLS via `SUPABASE_SERVICE_ROLE_KEY` |

---

## 5. TRINETRA Context & Error-Handling Contract

### 5.1 Telemetry Contract in `ContextBuilder.ts`
Currently, `ContextBuilder.ts` swallows errors from `nutritionService.getDailySummary()` and `workoutService.getTodayWorkout()`, causing TRINETRA to operate blind.

**Refined Contract**:
```typescript
export interface UserFitnessContext {
  userId: string;
  profile: any;
  fitnessProfile: any;
  goals: any[];
  todayWorkout: {
    activeSession: V2WorkoutSessionRecord | null;
    latestPlan: WorkoutPlanRecord | null;
  } | null;
  nutrition: {
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalWaterMl: number;
    meals: NutritionLogRecord[];
  } | null;
  recovery: any;
  progress: any;
  // Diagnostics flag to inform TRINETRA when telemetry failed vs genuinely 0 logs
  telemetryStatus: {
    nutritionOnline: boolean;
    workoutOnline: boolean;
  };
}
```

### 5.2 Tool Execution Error Handling
1. **`GetNutritionTool`**:
   - Must return `{ success: true, data: { ...summary } }` when query succeeds.
   - If database error occurs, return explicit error `{ success: false, error: "Nutrition service unavailable" }` rather than an empty 0-calorie payload.
2. **`GetTodayWorkoutTool`**:
   - Returns `{ activeSession, latestPlan }`. If no active session exists, returns `{ activeSession: null, latestPlan }` with `success: true`.
3. **`CreateWorkoutTool`**:
   - Targets `v2_workout_plans`. Inserts `{ user_id, title, description, schedule, organization_id }`.
4. **`ModifyWorkoutTool`**:
   - Validates session state transitions using the state machine before committing to DB.

---

## 6. Migration Dependency Graph & Exact File Sequence

```
                    ┌──────────────────────────────────────────┐
                    │                 PHASE 9B                 │
                    │   (legacy_user_id_map + water_logs)      │
                    │         [DEPLOYED & VERIFIED]            │
                    └─────────────────────┬────────────────────┘
                                          │
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │                PHASE 10A                 │
                    │   phase_10a_nutrition_core_schema.sql    │
                    │       (public.v2_nutrition_logs +       │
                    │    public.v2_daily_nutrition_summary)    │
                    └─────────────────────┬────────────────────┘
                                          │
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │                PHASE 10B                 │
                    │    phase_10b_workout_core_schema.sql     │
                    │       (public.v2_workout_plans +         │
                    │       public.v2_workout_sessions +       │
                    │          public.exercise_sets)           │
                    └──────────────────────────────────────────┘
```

### 6.1 Proposed File Specifications

#### File 1: `backend/supabase/migrations/phase_10a_nutrition_core_schema.sql`
- **Dependencies**: `public.profiles` (Phase 1), `phase_9b_legacy_identity_bridge.sql`.
- **Preflight Assertions**:
  - Assert `public.profiles` exists.
  - Assert `public.legacy_user_id_map` exists (Phase 9B confirmed).
- **Execution Content**:
  - Create table `public.v2_nutrition_logs`.
  - Create indexes `idx_v2_nutrition_logs_user_date` and `idx_v2_nutrition_logs_user_created`.
  - Create view `public.v2_daily_nutrition_summary`.
  - Enable RLS on `v2_nutrition_logs`.
  - Create member self-access policies (`v2_nutrition_member_*`).
  - Grant permissions to `authenticated` and `service_role`.
- **Consumers Unblocked**: `NutritionRepository`, `NutritionService`, `NutritionController`, `/api/v1/nutrition/daily`, `/api/v1/nutrition/meals`, `useNutritionData`, `NutritionLayout`, `GetNutritionTool`.

#### File 2: `backend/supabase/migrations/phase_10b_workout_core_schema.sql`
- **Dependencies**: `public.profiles` (Phase 1), `public.organizations` (Sprint 2F), `public.exercises` (Catalog).
- **Preflight Assertions**:
  - Assert `public.profiles` exists.
  - Assert `public.exercises` exists.
  - Assert `public.organizations` exists.
- **Execution Content**:
  - Create table `public.v2_workout_plans`.
  - Create table `public.v2_workout_sessions`.
  - Create table `public.exercise_sets`.
  - Create unique index `idx_v2_workout_sessions_single_active`.
  - Enable RLS across all three tables.
  - Create member self-access and tenant staff policies.
  - Grant permissions to `authenticated` and `service_role`.
- **Consumers Unblocked**: `V2WorkoutSessionRepository`, `WorkoutPlanRepository`, `WorkoutExecutionService`, `WorkoutController`, `/api/v1/workouts/*`, `useWorkoutData`, `WorkoutLayout`, `GetTodayWorkoutTool`, `CreateWorkoutTool`, `ModifyWorkoutTool`, `AdminRepository.getDashboardStats`.

---

## 7. Compatibility & Rollback Strategy

### 7.1 Legacy Table Preservation
- `public.nutrition_logs` (0 rows) and `public.user_meal_tracking` (0 rows) remain strictly intact.
- `public.workout_plans` (0 rows), `public.workout_sessions` (0 rows), `public.workout_logs` (0 rows) remain strictly intact.
- `public.water_logs` (13 rows) retains all Phase 9B triggers and profile mappings.

### 7.2 Post-Deployment Modern Data Preservation Protocol
If Phase 10A or Phase 10B must be rolled back, dropping tables directly would violate the **Zero Data Loss Rule** (DB-3H principle).

The rollback runbook must mandate an **archive-before-drop execution block**:
```sql
-- Phase 10 Rollback Archive Safety Gate
DO $$
DECLARE
    v_ts TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD_HH24MISS');
BEGIN
    -- 1. Archive Nutrition Logs if table exists and has rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_nutrition_logs') THEN
        IF EXISTS (SELECT 1 FROM public.v2_nutrition_logs LIMIT 1) THEN
            EXECUTE format('CREATE TABLE public.archive_v2_nutrition_logs_%s AS SELECT * FROM public.v2_nutrition_logs', v_ts);
        END IF;
    END IF;

    -- 2. Archive Workout Sessions if table exists and has rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_workout_sessions') THEN
        IF EXISTS (SELECT 1 FROM public.v2_workout_sessions LIMIT 1) THEN
            EXECUTE format('CREATE TABLE public.archive_v2_workout_sessions_%s AS SELECT * FROM public.v2_workout_sessions', v_ts);
        END IF;
    END IF;

    -- 3. Archive Exercise Sets if table exists and has rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercise_sets') THEN
        IF EXISTS (SELECT 1 FROM public.exercise_sets LIMIT 1) THEN
            EXECUTE format('CREATE TABLE public.archive_exercise_sets_%s AS SELECT * FROM public.exercise_sets', v_ts);
        END IF;
    END IF;
END $$;
```

---

## 8. Acceptance Criteria and Test Plan

### 8.1 Acceptance Criteria
1. **Nutrition Acceptance**:
   - A member can log 5 distinct meals on the same date (`YYYY-MM-DD`). Every meal is persisted and returned by `GET /api/v1/nutrition/daily`.
   - Macros (`protein_g`, `carbs_g`, `fats_g`) support fractional values with 2 decimal precision.
   - Deleting a meal removes only that entry.
   - `GET /api/v1/nutrition/water` queries `water_logs.profile_id = auth.uid()` without `22P02` integer errors.
2. **Workout Acceptance**:
   - Starting a workout creates a record in `v2_workout_sessions` with state `started`.
   - Consecutive calls to `startSession` return the existing active session without creating duplicates.
   - Logging a set creates an entry in `exercise_sets` associated with `session_id`.
   - Transitioning to `completed` records `completed_at` and closes the session. Subsequent transitions fail with `400 Bad Request`.
3. **Security Acceptance**:
   - Member B cannot view or modify Member A's meals or workout sessions.
   - Anonymous (`anon`) requests return `401 Unauthorized` or 0 rows.
   - Organization staff can view sessions belonging to their tenant organization.

### 8.2 Local Integration & Security Test Suites
Before any staging execution, two new test suites must be created and validated on disposable PostgreSQL:
- `backend/tests/integration/db4_nutrition_workout.integration.test.ts`
- `backend/tests/security/db4_nutrition_workout.security.test.ts`

---

## 9. Deferred Issues & Explicit Assumptions

1. **Deferred: `programs` & `program_versions` Publishing Engine**:
   - The B2B master workout program builder is an administrative feature scheduled for a subsequent sprint. Member workout execution does not depend on it.
2. **Deferred: Legacy User 153 in `daily_fitness_stats`**:
   - Legacy user 153 has 1 static row from 2026-06-30. Because no modern profile claims user 153, historical backfill is deferred.
3. **Assumption: Frontend API Contract Stability**:
   - The frontend consumers (`useNutritionData`, `useWorkoutData`) already match the schemas defined above and will function seamlessly once tables exist.

---

## 10. Final Recommendation: Status Gate

### Status: **READY FOR LOCAL IMPLEMENTATION**

- All contracts, schemas, foreign keys, RLS policies, indexes, and lifecycle state machines are strictly finalized.
- All dependencies on `exercise_sessions`, `workout_events`, and daily unique constraints have been safely resolved and eliminated.
- **Safety Boundary Observed**: No staging DDL/DML executed. Phase 9B remains intact.

---

## Operational Halt & Safety Confirmation

> [!NOTE]
> **Strict Halt Condition Reached**:
> - DB-4B contract finalization is complete.
> - **Zero remote or local schema migrations have been applied.**
> - Staging database `ymrblyiwohvxptiqjfsi` remains strictly at **Phase 9B**.
> - DB-4C local implementation must await explicit review of this document.
