# STRIVA V2 — DB-4A: Read-Only Nutrition and Workout Schema Audit

## Executive Summary & Audit Scope

This document provides a comprehensive, read-only architectural and database schema audit for the **Nutrition** and **Workout** domains in STRIVA V2. 

### Operational Context
- **Target Staging Environment**: Supabase Project Reference `ymrblyiwohvxptiqjfsi` (PostgreSQL 15.8)
- **Active Preceding Migration**: `phase_9b_legacy_identity_bridge.sql` (Phase 9B identity bridge, successfully deployed and verified on staging)
- **Phase 9B Status**: **Deployed, verified, and strictly unchanged.**
- **DB-4 Migration Status**: **Pre-implementation audit only.** No remote DDL, DML, backfills, or policy changes have been executed.

### Audit Methodology
The audit inspects and cross-references four primary layers:
1. **Verified Staging Database Schema**: Read-only queries of `information_schema.tables`, `columns`, `table_constraints`, `referential_constraints`, `pg_tables`, `pg_policies`, `role_table_grants`, and live table row counts on staging project `ymrblyiwohvxptiqjfsi`.
2. **Backend Domain Repositories & Services**: `NutritionRepository`, `NutritionService`, `NutritionController`, `V2WorkoutSessionRepository`, `LegacyWorkoutSessionRepository`, `WorkoutPlanRepository`, `WorkoutProgramRepository`, `WorkoutExecutionService`, `AnalyticsRepository`, and `AdminRepository`.
3. **TRINETRA AI Intelligence Layer**: `ContextBuilder`, `TrinetraTools` (`GetTodayWorkoutTool`, `CreateWorkoutTool`, `ModifyWorkoutTool`, `GetNutritionTool`, `LogWorkoutToolImpl`), and `IntelligenceSchemas`.
4. **Frontend Consumer Interfaces**: `src/api/nutritionApi.ts`, `src/hooks/useStrivaApi.ts`, `src/design-system/nutrition/NutritionLayout.tsx`, `src/design-system/workout/WorkoutLayout.tsx`, and `src/v3/pages/`.

---

## 1. Verified Staging Schema Findings

All findings in this section represent **verified facts** queried directly from the live staging database `ymrblyiwohvxptiqjfsi`.

### 1.1 Migration History State
The staging database contains **23 applied migrations** in `public._migrations`:
- **10 Legacy Migrations** (dated `2026-06-30`): Foundations for legacy users, subscriptions, workout logs, nutrition logs, water logs, and attendance.
- **12 V2 SaaS Foundation Migrations** (dated `2026-10-10` to `2026-10-11`): Multi-tenant organizations, staff, billing, notifications, AI memory, analytics, and RLS recursion fixes.
- **1 Identity Bridge Migration** (applied `2026-10-11`): `phase_9b_legacy_identity_bridge.sql` (added `legacy_user_id_map`, bridged `water_logs.profile_id`, established bidirectional synchronization triggers).

### 1.2 Nutrition Domain Staging Tables

| Table Name | Row Count | Primary Key | User Identifier Column | RLS Enabled | Policies Count | Foreign Keys |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `public.nutrition_logs` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.user_meal_tracking` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.water_logs` | 13 | `id` (INTEGER) | `user_id` (INT) + `profile_id` (UUID) | `true` | 2 | `users(id)`, `profiles(id)` |
| `public.water_goals` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.meal_plans` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.template_diet_plans` | 0 | `id` (INTEGER) | N/A (Template) | `true` | 0 | None |
| `public.user_diet_assignments` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)`, `diet_plans(id)` |
| `public.chatbot_generated_diets`| 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| **`public.v2_nutrition_logs`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |

#### Key Column Breakdown of Existing Legacy Nutrition Tables
- **`public.nutrition_logs`**:
  `id` (int4), `user_id` (int4), `date` (date NOT NULL), `food_item` (varchar), `calories` (int4 default 0), `protein` (int4 default 0), `protein_g` (numeric default 0), `carbs` (int4 default 0), `carbs_g` (numeric default 0), `fats` (int4 default 0), `fat_g` (numeric default 0), `logged_at` (timestamptz default now()).
- **`public.user_meal_tracking`**:
  `id` (int4), `user_id` (int4), `date` (date NOT NULL), `meal_type` (varchar), `food_item` (varchar), `calories` (int4 default 0), `protein` (int4 default 0), `carbs` (int4 default 0), `fats` (int4 default 0), `created_at` (timestamptz default CURRENT_TIMESTAMP).
- **`public.water_logs`**:
  `id` (int4), `user_id` (int4 NOT NULL), `amount_ml` (int4 NOT NULL), `logged_at` (timestamptz), `created_at` (timestamptz), `profile_id` (uuid nullable, populated by Phase 9B), `source_system` (varchar).

### 1.3 Workout Domain Staging Tables

| Table Name | Row Count | Primary Key | User Identifier Column | RLS Enabled | Policies Count | Foreign Keys |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `public.workout_plans` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.workout_sessions` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)`, `workout_plans(id)` |
| `public.workout_logs` | 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)`, `workout_plans(id)` |
| `public.workout_progress` | 0 | `id` (INTEGER) | via `session_id` (INTEGER) | `true` | 0 | `workout_sessions(id)` ON DELETE CASCADE |
| `public.user_workout_assignments`| 0 | `id` (INTEGER) | `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)`, `workout_plans(id)` |
| `public.template_workout_plans` | 0 | `id` (INTEGER) | N/A (Template) | `true` | 0 | None |
| `public.chatbot_generated_workouts`| 0 | `id` (INTEGER)| `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.daily_fitness_stats` | 1 | `user_id` (INTEGER)| `user_id` (INTEGER NOT NULL) | `true` | 0 | `users(id)` ON DELETE CASCADE |
| `public.exercises` | 4 | `id` (UUID) | N/A (Catalog) | `true` | 1 | `exercise_categories(id)`, etc. |
| `public.exercise_categories` | 5 | `id` (UUID) | N/A (Catalog) | `true` | 1 | None |
| `public.v2_fitness_profiles` | 4 | `id` (UUID) | `id` (UUID FK to `profiles`) | `true` | 2 | `profiles(id)` ON DELETE CASCADE |
| **`public.v2_workout_sessions`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |
| **`public.exercise_sets`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |
| **`public.exercise_sessions`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |
| **`public.workout_events`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |
| **`public.programs`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |
| **`public.program_versions`** | **DOES NOT EXIST** | N/A | N/A | N/A | N/A | N/A |

#### Key Column Breakdown of Existing Workout Tables
- **`public.workout_plans` (Legacy)**:
  `id` (int4), `user_id` (int4 NOT NULL), `date` (date NOT NULL), `focus` (varchar), `duration` (varchar), `exercises` (jsonb NOT NULL), `calories_estimate` (int4 default 0), `difficulty` (varchar default 'Moderate'), `raw_prompt` (text), `created_at` (timestamptz default now()).
- **`public.workout_sessions` (Legacy)**:
  `id` (int4), `user_id` (int4 NOT NULL), `plan_id` (int4 NOT NULL), `status` (varchar default 'active'), `start_time` (timestamptz default now()), `end_time` (timestamptz), `completed_exercises` (jsonb), `progress_percentage` (int4 default 0), `calories_burned` (int4 default 0), `created_at` (timestamptz default now()).
- **`public.daily_fitness_stats`**:
  Contains 1 row: `{ user_id: 153, daily_progress_percentage: 100, active_minutes: 0, completed_goals: 0, updated_at: '2026-06-30T15:01:55.653Z' }`.

---

## 2. Repository, API, and Frontend Contract Findings

### 2.1 Nutrition Domain Contract Analysis

#### A. Architecture Conflict: Individual Meal Entries vs. Daily Aggregates
Our audit reveals a direct architectural clash between three distinct code sources:

1. **Canonical V2 Module (`backend/src/modules/nutrition`)**:
   - `NutritionRepository.ts` inserts and queries **individual meal entries**:
     ```typescript
     // NutritionRepository.ts line 57-67
     await this.supabase.from('v2_nutrition_logs').insert({
       user_id: userId,
       date: dateStr,
       meal_type: dto.meal_type, // 'breakfast' | 'lunch' | 'dinner' | 'snack'
       food_name: dto.food_name,
       calories: dto.calories,
       protein_g: dto.protein_g ?? 0,
       carbs_g: dto.carbs_g ?? 0,
       fats_g: dto.fats_g ?? 0,
     });
     ```
   - `NutritionService.getDailySummary()` aggregates these individual meals on the fly to compute totals:
     ```typescript
     // NutritionService.ts line 30-33
     const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
     const totalProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
     const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
     const totalFats = meals.reduce((sum, m) => sum + (m.fats_g || 0), 0);
     ```
   - Frontend UI (`src/design-system/nutrition/NutritionLayout.tsx` & `ChronologicalMealList.tsx`):
     Renders a timeline of individual logged meals (Breakfast at 08:30, Lunch at 13:00, etc.) with specific calories and macros per meal.
   
2. **Intelligence Module (`backend/src/modules/intelligence`)**:
   - `LogNutritionDTO` in `IntelligenceSchemas.ts` defines a **daily summary record**:
     `{ date: string, calories_consumed: number, protein_g: number, carbs_g: number, fats_g: number, hydration_ml: number, notes: string }`.
   - `Intelligence/NutritionRepository.ts` executes an upsert targeting daily uniqueness:
     ```typescript
     await this.supabase.from('v2_nutrition_logs').upsert(payload, { onConflict: 'user_id,date' });
     ```

3. **Unapplied Migration Artifact (`v2_additive_migration.sql`)**:
   - Lines 522–535 defined `v2_nutrition_logs` with `UNIQUE (user_id, date)` and columns `calories_consumed`, `hydration_ml`.

#### Core Contract Determination
> [!IMPORTANT]
> **Strict Operational Rule**: As commanded in the DB-4A instructions, **no daily uniqueness constraint (`UNIQUE (user_id, date)`) can be introduced on meal tracking tables.**
> 
> Applying a daily unique constraint would cause any user attempting to log breakfast followed by lunch to trigger a PostgreSQL `23505 unique_violation` error.
> 
> **Architectural Resolution**:
> - The primary table `public.v2_nutrition_logs` must represent **individual meal records** with columns `id UUID`, `user_id UUID`, `date DATE`, `meal_type VARCHAR`, `food_name TEXT`, `calories INT`, `protein_g NUMERIC`, `carbs_g NUMERIC`, `fats_g NUMERIC`.
> - Daily aggregation is safely computed by `NutritionService` or an additive read-only view (`public.v2_daily_nutrition_summary`), maintaining full support for both individual meal timelines and macro analytics.

#### B. Hydration Cross-Query Identity Mismatch
In `backend/src/modules/nutrition/repositories/NutritionRepository.ts`:
```typescript
// Line 130-134
const { data, error } = await this.supabase
  .from('water_logs')
  .select('*')
  .eq('user_id', userId) // <-- BUG: userId is Supabase Auth UUID ('b0b7...')
  .order('created_at', { ascending: true });
```
- In staging, `water_logs.user_id` is an `INTEGER NOT NULL`.
- Passing a UUID string into `eq('user_id', userId)` triggers PostgreSQL error `22P02: invalid input syntax for type integer: "<UUID>"`.
- Phase 9B successfully added `profile_id UUID` to `water_logs`, but `NutritionRepository.ts` was never updated to query `.eq('profile_id', userId)`.
- Furthermore, `NutritionRepository.addWaterLog` attempts to insert `{ user_id: userId, amount_ml: dto.amount_ml }`. If `user_id` is passed as a UUID, it crashes with `22P02`. If omitted, it violates `water_logs.user_id NOT NULL` unless resolved through the identity bridge.

---

### 2.2 Workout Domain Contract Analysis

#### A. Missing Execution Tables
1. **`v2_workout_sessions`**:
   - `V2WorkoutSessionRepository.ts` is the active repository wired into `WorkoutExecutionService` and `/api/v1/workouts`.
   - It performs queries against `v2_workout_sessions`:
     - `startSession`: inserts `{ user_id: UUID, plan_id: UUID, title, state: 'started', started_at }`
     - `getActiveSession`: selects where `user_id = UUID AND state = 'started'`
     - `transitionState`: updates `state`, `started_at`, `completed_at`, `notes`
   - Because `v2_workout_sessions` does not exist on staging, every endpoint under `/api/v1/workouts/sessions` and `/api/v1/workouts/today` returns an error or empty state.

2. **`exercise_sets`**:
   - `V2WorkoutSessionRepository.completeSet` and `createSet` query and insert into `exercise_sets` (`session_id UUID`, `exercise_id UUID`, `weight_kg`, `reps`, `rpe`, `status`, `completed_at`).
   - The frontend `WorkoutLayout.handleCompleteSet()` dispatches `POST /workouts/sets` to record completed repetitions and resistance.
   - Table `exercise_sets` does not exist in staging.

3. **`programs` and `program_versions`**:
   - `WorkoutProgramRepository.ts` queries `programs` and `program_versions`.
   - Neither table exists on staging.

#### B. Schema & Type Incompatibility on `workout_plans`
`WorkoutPlanRepository.ts` defines:
```typescript
export interface WorkoutPlanRecord {
  id: string; // UUID
  user_id: string; // UUID
  organization_id?: string | null;
  title: string;
  description?: string | null;
  schedule?: any; // JSONB
  is_active?: boolean;
}
```
Comparing this with the actual staging table `public.workout_plans`:
- `id`: Staging has `INTEGER`; Repository expects `UUID`.
- `user_id`: Staging has `INTEGER NOT NULL` (FK to `users.id`); Repository sends `UUID`.
- `title`: Staging does **NOT** have `title` (column does not exist).
- `date`: Staging requires `date DATE NOT NULL`; Repository does not supply `date`.
- `exercises`: Staging requires `exercises JSONB NOT NULL`; Repository does not supply `exercises`.
- `organization_id`: Staging does **NOT** have `organization_id`.

**Result**: Executing `WorkoutPlanRepository.createPlan()` throws PostgreSQL errors:
1. `column "title" of relation "workout_plans" does not exist`
2. `null value in column "date" of relation "workout_plans" violates not-null constraint`

---

### 2.3 Cross-Domain and Intelligence Layer Contract Findings

#### A. TRINETRA AI Pipeline (`ContextBuilder` & `TrinetraTools`)
1. **Silent Telemetry Degradation**:
   `ContextBuilder.buildContext(userId)` builds the system prompt context for TRINETRA by invoking:
   ```typescript
   this.workoutService.getTodayWorkout(userId).catch(() => null);
   this.nutritionService.getDailySummary(userId).catch(() => null);
   ```
   Because `v2_nutrition_logs` and `v2_workout_sessions` do not exist, both promises reject or return failures.
   The errors are caught, resulting in `todayWorkout: null` and `nutrition: null`.
   TRINETRA is rendered incapable of recognizing whether the member has exercised, logged meals, or met calorie/hydration targets.
2. **Tool Invocation Failures**:
   - `GetNutritionTool` fails with `Database error querying nutrition logs: table not found`.
   - `CreateWorkoutTool` fails with `column "title" does not exist`.
   - `ModifyWorkoutTool` fails because the underlying session cannot be created.

#### B. Analytics and Admin Repositories
1. **`AnalyticsRepository.ts`**:
   - `getWorkoutSessionsForUsers(userIds)`: Passes UUIDs to `workout_sessions.in('user_id', userIds)`. Fails with `22P02 invalid input syntax for integer`.
   - `getExerciseSetsForSessions(sessionIds)`: Queries `exercise_sessions` and `exercise_sets`. Both tables do not exist.
   - `getNutritionLogsForUsers(userIds)`: Passes UUIDs to legacy `nutrition_logs.in('user_id', userIds)`. Fails with `22P02`.
2. **`AdminRepository.ts`**:
   - `getDashboardStats(organizationId)`: Executes `this.supabase.from('workout_plans').select('id').eq('organization_id', organizationId)`. Fails with `column workout_plans.organization_id does not exist`.

---

## 3. Exact Incompatibilities and Severity Matrix

| ID | Domain | Affected Asset / File | Staging Fact vs Code Expectation | Exact Error / Symptom | Severity |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **INC-01** | Nutrition | `NutritionRepository.ts`<br>`NutritionService.ts` | Code targets `v2_nutrition_logs`. Staging has only legacy `nutrition_logs` (INT PK) and `user_meal_tracking`. | `PGRST205: relation "v2_nutrition_logs" does not exist`<br>UI displays "Database error querying nutrition logs". | **P0 (Blocker)** |
| **INC-02** | Workout | `V2WorkoutSessionRepository.ts`<br>`WorkoutExecutionService.ts` | Code targets `v2_workout_sessions`. Staging has only legacy `workout_sessions` (INT PK, INT user_id). | `PGRST205: relation "v2_workout_sessions" does not exist`<br>Active workouts cannot start or transition. | **P0 (Blocker)** |
| **INC-03** | Workout | `V2WorkoutSessionRepository.ts`<br>`WorkoutLayout.tsx` | Code logs sets into `exercise_sets`. Table does not exist in staging. | `PGRST205: relation "exercise_sets" does not exist`<br>Set logging fails. | **P0 (Blocker)** |
| **INC-04** | Workout | `WorkoutPlanRepository.ts`<br>`AdminRepository.ts` | Code assumes UUID `id`, `user_id`, `title`, `schedule`, `organization_id`. Staging `workout_plans` requires INT `user_id`, `date DATE NOT NULL`, `exercises JSONB NOT NULL`. | `42703: column "title" does not exist`<br>`23502: null value in column "date" violates not-null constraint`. | **P0 (Blocker)** |
| **INC-05** | Hydration | `NutritionRepository.getWaterLogs`<br>`NutritionRepository.addWaterLog` | Code passes UUID `userId` to `water_logs.user_id`. Staging `water_logs.user_id` is `INTEGER`. | `22P02: invalid input syntax for type integer: "<UUID>"`. Hydration returns 0 ml always. | **P1 (High)** |
| **INC-06** | AI / TRINETRA | `ContextBuilder.ts`<br>`TrinetraTools.ts` | TRINETRA context builder depends on nutrition and workout service outputs. | Fails silently; TRINETRA runs with zero fitness/nutrition memory. | **P1 (High)** |
| **INC-07** | Analytics | `AnalyticsRepository.ts` | Queries legacy `workout_sessions` and `nutrition_logs` with UUID arrays; queries missing `exercise_sessions`. | `22P02 invalid input syntax for integer`<br>`PGRST205 relation does not exist`. | **P1 (High)** |
| **INC-08** | Legacy RLS | `nutrition_logs`<br>`user_meal_tracking`<br>`workout_plans`<br>`workout_sessions` | All 4 legacy tables have `rowsecurity = true` but **0 policies defined**. | Any direct client query is denied closed (`403` / empty result). | **P2 (Medium)** |
| **INC-09** | Architecture | `IntelligenceSchemas.ts`<br>`v2_additive_migration.sql` | `modules/intelligence` expects daily unique upsert `UNIQUE(user_id, date)`. V2 core expects multiple meals per day. | If unique constraint applied, second meal logged per day crashes with `23505 unique_violation`. | **P1 (High)** |

---

## 4. Proposed Migration Sequence (DB-4 Design)

To resolve all incompatibilities safely without breaking Phase 9B or mutating legacy data, we propose a modular, additive migration strategy utilizing the **Dual-Key Strangler Fig Pattern**.

```
                           AUTHENTICATED REQUEST
                        (Supabase Auth JWT: UUID)
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │               STRIVA V2 CANONICAL DOMAINS              │
       ├────────────────────────────┬───────────────────────────┤
       │      NUTRITION DOMAIN      │      WORKOUT DOMAIN       │
       │  (Individual Meal Logs)    │  (Execution & Sets Engine)│
       └─────────────┬──────────────┴─────────────┬─────────────┘
                     │                            │
                     ▼                            ▼
          public.v2_nutrition_logs     public.v2_workout_sessions
          (UUID PK, user_id UUID)      (UUID PK, user_id UUID)
                     │                            │
                     │                            ▼
                     │                  public.exercise_sets
                     │                 (UUID PK, session_id UUID,
                     │                  exercise_id UUID -> exercises)
                     │                            │
                     ▼                            ▼
          public.water_logs             public.v2_workout_plans
          (profile_id UUID bridged     (UUID PK, user_id UUID,
           via Phase 9B)                organization_id UUID)
```

### 4.1 Migration File Breakdown

#### Step 1: `phase_10a_nutrition_core_schema.sql` (Additive)
- **Objective**: Create the canonical V2 individual meal tracking table and establish hydration query alignment.
- **DDL Specifications**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.v2_nutrition_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      meal_type VARCHAR(32) NOT NULL DEFAULT 'snack', -- 'breakfast','lunch','dinner','snack'
      food_name TEXT NOT NULL,
      calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0),
      protein_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
      carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
      fats_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (fats_g >= 0),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Indexing for rapid daily and range queries
  CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_user_date 
      ON public.v2_nutrition_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_created 
      ON public.v2_nutrition_logs(user_id, created_at DESC);

  -- CRITICAL RULE: NO UNIQUE (user_id, date) constraint! Multiple meals per day allowed.
  ```
- **Optional Read-Only Aggregation View (For Intelligence & Analytics)**:
  ```sql
  CREATE OR REPLACE VIEW public.v2_daily_nutrition_summary AS
  SELECT 
      user_id,
      date,
      SUM(calories)::INT AS total_calories,
      SUM(protein_g)::NUMERIC(8,2) AS total_protein_g,
      SUM(carbs_g)::NUMERIC(8,2) AS total_carbs_g,
      SUM(fats_g)::NUMERIC(8,2) AS total_fats_g,
      COUNT(id)::INT AS meal_count
  FROM public.v2_nutrition_logs
  GROUP BY user_id, date;
  ```
- **RLS & Security**:
  ```sql
  ALTER TABLE public.v2_nutrition_logs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "v2_nutrition_member_select" ON public.v2_nutrition_logs
      FOR SELECT TO authenticated USING (auth.uid() = user_id);

  CREATE POLICY "v2_nutrition_member_insert" ON public.v2_nutrition_logs
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "v2_nutrition_member_update" ON public.v2_nutrition_logs
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "v2_nutrition_member_delete" ON public.v2_nutrition_logs
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  ```
- **Grants**:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_nutrition_logs TO authenticated;
  GRANT ALL ON public.v2_nutrition_logs TO service_role;
  ```

#### Step 2: `phase_10b_workout_execution_schema.sql` (Additive)
- **Objective**: Establish canonical V2 workout session tracking, set-level logging, and plan alignment.
- **DDL Specifications**:
  ```sql
  -- 1. Canonical V2 Workout Plans
  CREATE TABLE IF NOT EXISTS public.v2_workout_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'Workout Plan',
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

  -- 2. Canonical V2 Workout Sessions
  CREATE TABLE IF NOT EXISTS public.v2_workout_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES public.v2_workout_plans(id) ON DELETE SET NULL,
      day_id TEXT,
      title TEXT NOT NULL DEFAULT 'Workout Session',
      state VARCHAR(32) NOT NULL DEFAULT 'started' 
          CHECK (state IN ('not_started', 'started', 'in_progress', 'paused', 'completed', 'abandoned', 'cancelled')),
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

  -- 3. Canonical Exercise Sets
  CREATE TABLE IF NOT EXISTS public.exercise_sets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES public.v2_workout_sessions(id) ON DELETE CASCADE,
      exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
      weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
      reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
      rpe NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
      status VARCHAR(32) NOT NULL DEFAULT 'completed' CHECK (status IN ('planned', 'completed', 'skipped')),
      completed_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_exercise_sets_session 
      ON public.exercise_sets(session_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise 
      ON public.exercise_sets(exercise_id);
  ```
- **RLS & Security**:
  ```sql
  ALTER TABLE public.v2_workout_plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.v2_workout_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

  -- Plans Policies
  CREATE POLICY "v2_workout_plans_member_manage" ON public.v2_workout_plans
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- Sessions Policies
  CREATE POLICY "v2_workout_sessions_member_manage" ON public.v2_workout_sessions
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- Sets Policies (scoped through parent session)
  CREATE POLICY "exercise_sets_member_manage" ON public.exercise_sets
      FOR ALL TO authenticated 
      USING (EXISTS (
          SELECT 1 FROM public.v2_workout_sessions s 
          WHERE s.id = exercise_sets.session_id AND s.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
          SELECT 1 FROM public.v2_workout_sessions s 
          WHERE s.id = exercise_sets.session_id AND s.user_id = auth.uid()
      ));
  ```
- **Grants**:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_workout_plans TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.v2_workout_sessions TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_sets TO authenticated;
  GRANT ALL ON public.v2_workout_plans, public.v2_workout_sessions, public.exercise_sets TO service_role;
  ```

#### Step 3: Backend Repository Code Updates (Zero DB Mutation)
1. **`NutritionRepository.ts`**:
   - Update `getWaterLogs` to query `.eq('profile_id', userId)` instead of `.eq('user_id', userId)`.
   - Update `addWaterLog` to insert `{ profile_id: userId, amount_ml: dto.amount_ml }`, letting the Phase 9B trigger automatically synchronize `user_id` if a mapping exists in `legacy_user_id_map`.
2. **`WorkoutPlanRepository.ts`**:
   - Update base table from legacy `'workout_plans'` to `'v2_workout_plans'`.
3. **`AnalyticsRepository.ts` & `AdminRepository.ts`**:
   - Update workout and nutrition queries to target `v2_workout_sessions` and `v2_nutrition_logs`.

---

## 5. Data-Preservation and Rollback Strategy

### 5.1 Legacy Baseline Data Preservation
The audit identified active baseline data in staging:
- **`water_logs`**: Exactly 13 rows preserved from Phase 9B.
- **`exercises`**: Exactly 4 rows cataloged.
- **`exercise_categories`**: Exactly 5 rows cataloged.
- **`v2_fitness_profiles`**: Exactly 4 rows active.
- **`daily_fitness_stats`**: Exactly 1 row (`user_id = 153`).
- **`legacy_user_id_map`**: Exactly 2 mapped rows (`148` and `151`).

**Safety Rule**: All proposed migrations are purely additive. They do not drop, alter, truncate, or overwrite any of the existing legacy or Phase 9B tables. All 13 hydration rows and all legacy integer tables remain intact.

### 5.2 Rollback Data-Loss Prevention (The DB-3H Principle)
In the event that the DB-4 migrations need to be rolled back after deployment, simply dropping `v2_nutrition_logs`, `v2_workout_sessions`, and `exercise_sets` would destroy all user meals and workout sessions logged between deployment and rollback.

To prevent data loss, the rollback runbook must mandate an **archive-before-drop protocol**:

```sql
-- ROLLBACK ARCHIVE PROTOCOL (Example for DB-4 Rollback)
DO $$
DECLARE
    v_ts TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD_HH24MISS');
BEGIN
    -- Archive modern nutrition logs if table exists and has rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'v2_nutrition_logs') THEN
        EXECUTE format('CREATE TABLE public.archive_v2_nutrition_logs_%s AS SELECT * FROM public.v2_nutrition_logs', v_ts);
        REVOKE ALL ON public.v2_nutrition_logs FROM anon, authenticated;
    END IF;

    -- Archive modern workout sessions if table exists and has rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'v2_workout_sessions') THEN
        EXECUTE format('CREATE TABLE public.archive_v2_workout_sessions_%s AS SELECT * FROM public.v2_workout_sessions', v_ts);
        REVOKE ALL ON public.v2_workout_sessions FROM anon, authenticated;
    END IF;

    -- Archive modern exercise sets if table exists and has rows
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_sets') THEN
        EXECUTE format('CREATE TABLE public.archive_exercise_sets_%s AS SELECT * FROM public.exercise_sets', v_ts);
        REVOKE ALL ON public.exercise_sets FROM anon, authenticated;
    END IF;
END $$;
```

---

## 6. Local Integration and Security Test Plan

Before proposing any migration execution on staging, the following automated test suites must be developed and validated against a disposable local PostgreSQL instance:

### 6.1 Planned Test Suites

1. **`db4_schema_compatibility.integration.test.ts`**:
   - Asserts that `v2_nutrition_logs`, `v2_workout_plans`, `v2_workout_sessions`, and `exercise_sets` can be created idempotently (`IF NOT EXISTS`).
   - Asserts foreign key cascade rules (deleting a profile cascades to meal logs; deleting a session cascades to exercise sets; deleting an exercise sets `exercise_id` to NULL without deleting sets).
   - Validates that multiple meals can be logged on the exact same date (`YYYY-MM-DD`) by the same `user_id` without triggering unique constraint violations.

2. **`db4_hydration_alignment.integration.test.ts`**:
   - Asserts that inserting a water log with `profile_id UUID` succeeds.
   - Validates that the Phase 9B trigger successfully populates `legacy_user_id` when the user is mapped in `legacy_user_id_map`.
   - Validates that `NutritionRepository.getWaterLogs` successfully retrieves rows when filtering on `profile_id`.

3. **`db4_rls_security.test.ts`**:
   - Validates that authenticated member A cannot read, update, or delete member B's meal logs in `v2_nutrition_logs`.
   - Validates that authenticated member A cannot transition member B's active workout session in `v2_workout_sessions`.
   - Validates that an unauthenticated (`anon`) client receives `403 Forbidden` / 0 rows for all tables.
   - Validates that `service_role` maintains administrative access without policy violation.

4. **`db4_trinetra_tool_execution.test.ts`**:
   - Simulates `ContextBuilder.buildContext()` with live test data, verifying that `todayWorkout` and `nutrition` are populated with real values instead of falling back to null.
   - Executes `GetNutritionTool`, `GetTodayWorkoutTool`, and `CreateWorkoutTool` to verify end-to-end tool contracts.

---

## 7. Explicit List of Unresolved Assumptions

To maintain engineering transparency, the following items are documented as **unresolved assumptions** pending stakeholder sign-off:

1. **Legacy Ingestion Status**:
   - *Assumption*: Legacy tables `public.nutrition_logs` (0 rows) and `public.user_meal_tracking` (0 rows) have no active producers in production.
   - *Verification Needed*: Confirm whether any background cron or external webhook still writes to `user_meal_tracking`. If none, legacy tables can be safely archived or mirrored via a compatibility view.

2. **Legacy User 153 in `daily_fitness_stats`**:
   - *Assumption*: The single record in `daily_fitness_stats` belongs to legacy user `153`, who has no mapping in `legacy_user_id_map` (which contains only `148` and `151`).
   - *Verification Needed*: Determine whether user `153` requires a historical identity bridge before any statistics backfill is attempted.

3. **Workout Programs & Discovery**:
   - *Assumption*: The V2 workout roadmap prioritizes self-guided and AI-generated workout execution (`v2_workout_plans`, `v2_workout_sessions`) over the administrative `programs` and `program_versions` catalog.
   - *Verification Needed*: Confirm whether administrative program publishing is required in Phase 10 or can be scheduled for a subsequent sprint.

---

## Operational Halt & Safety Confirmation

> [!NOTE]
> **Strict Halt Condition Reached**:
> - This audit document completes the requirements of **STRIVA V2 — DB-4A**.
> - **Zero remote DDL, DML, or backfills have been executed.**
> - Staging database `ymrblyiwohvxptiqjfsi` remains strictly at **Phase 9B**.
> - DB-4 migration implementation has **not** started.
