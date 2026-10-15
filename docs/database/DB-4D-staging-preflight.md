# STRIVA V2 — DB-4D: Phase 10A/10B Read-Only Staging Preflight Report

**Document Version:** 1.0.0  
**Preflight Date:** October 12, 2026  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Host / Address:** `2406:da1a:b00:1301:3210:50bf:8c8:6055` (`db.ymrblyiwohvxptiqjfsi.supabase.co:5432`)  
**Database Engine:** PostgreSQL 17.6 on aarch64-unknown-linux-gnu (Compiled by GCC 15.2.0, 64-bit)  
**Execution Nature:** **100% Read-Only Preflight Inspection.** Zero remote DDL, DML, backfills, or policy changes executed.  
**Preceding Migration Baseline:** Phase 9B (`phase_9b_legacy_identity_bridge.sql`, Deployed & Verified, Untouched).  
**Proposed Deployment Candidates:**
1. `backend/supabase/migrations/phase_10a_nutrition_core_schema.sql` (Phase 10A - Nutrition Core Schema)
2. `backend/supabase/migrations/phase_10b_workout_core_schema.sql` (Phase 10B - Workout Core Schema)

---

## 1. VERIFIED STAGING BASELINE

All findings in this section represent verified facts introspected directly from the live staging database `ymrblyiwohvxptiqjfsi`.

### 1.1 Project Identity & Connection Verification
- **Current Database**: `postgres`
- **Current Executing Role**: `postgres`
- **Server Address**: `2406:da1a:b00:1301:3210:50bf:8c8:6055`
- **PostgreSQL Version**: `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit`

### 1.2 Migration History State (`public._migrations`)
- **Total Applied Migrations**: **23** (Sequential and unbroken)
- **Phase 9B Status**: **PRESENT & CONFIRMED**
  - Name: `phase_9b_legacy_identity_bridge.sql`
  - Applied Timestamp: `Sun Oct 11 2026 22:37:36 GMT+0530 (India Standard Time)`
- **Phase 10 Migration State**: **0 applied entries** (Target schema is completely clean and unapplied)

### 1.3 Hydration Data & Schema Baseline (`public.water_logs`)
- **Total Row Count**: Exactly **13** (Zero historical data loss since pre-Phase 9B baseline)
- **Column Structure Verified**:
  - `id`: `integer NOT NULL PRIMARY KEY`
  - `user_id`: `integer nullable`
  - `intake_amount`: `integer NOT NULL`
  - `intake_type`: `character varying nullable`
  - `source`: `character varying nullable`
  - `created_at`: `timestamptz nullable`
  - `profile_id`: `uuid nullable` (Phase 9B bridged column)
  - `amount_ml`: `integer nullable` (Phase 9B backfilled volume column)
- **Sequence State**: `public.water_logs_id_seq` is active with `last_value = 18`.

### 1.4 Identity Bridge State (`public.legacy_user_id_map`)
- **Total Row Count**: Exactly **2**
- **Verified Identity Pairs**:
  1. Legacy Integer ID `148` $\longleftrightarrow$ Profile UUID `b96c0b60-9a8b-496f-9e33-f533982412f6`
  2. Legacy Integer ID `151` $\longleftrightarrow$ Profile UUID `2dbbad1d-5988-4d6f-8c32-5c57080e56f5`
- **Column Signature**: `legacy_integer_id (int4)`, `profile_id (uuid)`, `email (text)`, `verification_method (text)`, `created_at`, `updated_at`.

### 1.5 Active Identity & Compatibility Triggers
- `public.water_logs`:
  - `trg_sync_water_logs_compatibility` (BEFORE INSERT, ROW level): Executes `sync_water_logs_compatibility()`.
  - `trg_sync_water_logs_compatibility` (BEFORE UPDATE, ROW level): Executes `sync_water_logs_compatibility()`.
- `public.profiles`:
  - `update_profiles_modtime` (BEFORE UPDATE, ROW level): Executes `update_modified_column()`.

### 1.6 Prerequisite Tables & Referenced Foreign Key Targets
| Table Name | Presence | Row Count | Primary Key Column & Data Type | Compatibility Status |
| :--- | :---: | :---: | :--- | :--- |
| `public.profiles` | **EXISTS** | 5 | `id` (`UUID NOT NULL`) | **COMPATIBLE** (Target for `v2_nutrition_logs.user_id`, `v2_workout_plans.user_id`, `v2_workout_sessions.user_id`) |
| `public.organizations` | **EXISTS** | 1 | `id` (`UUID NOT NULL`) | **COMPATIBLE** (Target for `organization_id`) |
| `public.organization_members` | **EXISTS** | 0 | `id` (`UUID NOT NULL`) | **COMPATIBLE** (Membership lookup table) |
| `public.exercises` | **EXISTS** | 4 | `id` (`UUID NOT NULL`) | **COMPATIBLE** (Target for `exercise_sets.exercise_id`) |
| `public.exercise_categories` | **EXISTS** | 5 | `id` (`UUID NOT NULL`) | **COMPATIBLE** |
| `public.users` (legacy) | **EXISTS** | 7 | `id` (`SERIAL / INT NOT NULL`) | **COMPATIBLE** (Phase 9B legacy bridge intact) |

### 1.7 Existing Legacy Nutrition & Workout Tables
| Legacy Table | Exists | Row Count | RLS Enabled | Policies Count | Foreign Key References |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `public.nutrition_logs` | Yes | 0 | True | 0 | `users(id)` |
| `public.user_meal_tracking` | Yes | 0 | True | 0 | `users(id)` |
| `public.meal_plans` | Yes | 0 | True | 0 | `users(id)` |
| `public.workout_plans` | Yes | 0 | True | 0 | `users(id)` |
| `public.workout_sessions` | Yes | 0 | True | 0 | `users(id)` |
| `public.workout_logs` | Yes | 0 | True | 0 | `users(id)` |
| `public.exercise_logs` | No | - | - | - | Does not exist |

All existing legacy workout and nutrition tables remain 100% empty and untouched.

### 1.8 Phase 10 Target Objects Verification (Clean Slate)
| Target Migration Object | Object Type | Staging State | Safety Finding |
| :--- | :--- | :--- | :--- |
| `public.v2_nutrition_logs` | TABLE | **DOES NOT EXIST** | Clean candidate for Phase 10A creation |
| `public.v2_daily_nutrition_summary` | VIEW | **DOES NOT EXIST** | Clean candidate for Phase 10A creation |
| `public.v2_workout_plans` | TABLE | **DOES NOT EXIST** | Clean candidate for Phase 10B creation |
| `public.v2_workout_sessions` | TABLE | **DOES NOT EXIST** | Clean candidate for Phase 10B creation |
| `public.exercise_sets` | TABLE | **DOES NOT EXIST** | Clean candidate for Phase 10B creation |

Zero namespace collisions exist on the staging database.

---

## 2. MIGRATION FILE & RUNNER REVIEW

### 2.1 Targeted Migration Runner (`backend/scripts/apply_staging_migrations.js`)
- **Registered Order**:
  ```javascript
  const migrations = [
    // ... prior 12 migrations ...
    'phase_9b_legacy_identity_bridge.sql',
    'phase_10a_nutrition_core_schema.sql',
    'phase_10b_workout_core_schema.sql'
  ];
  ```
- **Targeted Filtering Logic**:
  The runner accepts `process.argv[2]`. When executed with `phase_10a_nutrition_core_schema.sql`, it strictly filters `migrationsToProcess` to `['phase_10a_nutrition_core_schema.sql']`.
  If an unregistered file is passed, it fails closed with `Error: Target migration "..." is not registered in runner migration list`.
- **Advisory Lock & Atomicity**:
  Acquires transaction-level 64-bit advisory lock `SELECT pg_advisory_xact_lock(746291048201582)` within `BEGIN`.
  If any statement fails, calls `ROLLBACK` and releases connection.
  PostgreSQL automatically releases the transaction-level advisory lock upon transaction termination.

### 2.2 Phase 10A Migration Review (`phase_10a_nutrition_core_schema.sql`)
1. **Additive Invariant**: Creates `public.v2_nutrition_logs` and view `public.v2_daily_nutrition_summary`. Zero legacy tables are dropped or modified.
2. **Identity Model**: `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`. Targets authenticated Supabase Auth profile UUID.
3. **Multi-Meal Support**: No `UNIQUE(user_id, date)` constraint is present. Multiple meals per day are fully supported.
4. **Macro Integrity**:
   - `calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0 AND calories <= 20000)`
   - `protein_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (protein_g >= 0.00 AND protein_g <= 1000.00)`
   - `carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (carbs_g >= 0.00 AND carbs_g <= 1000.00)`
   - `fats_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (fats_g >= 0.00 AND fats_g <= 1000.00)`
5. **Aggregating View Security**:
   `CREATE OR REPLACE VIEW public.v2_daily_nutrition_summary WITH (security_invoker = true)`
   In PostgreSQL 15+, `security_invoker = true` guarantees that view execution evaluates the invoking caller's RLS policies, preventing cross-member aggregate leakage.
6. **Grants**: `REVOKE ALL FROM PUBLIC, anon; GRANT ... TO authenticated; GRANT ALL TO service_role`.

### 2.3 Phase 10B Migration Review (`phase_10b_workout_core_schema.sql`)
1. **Additive Invariant**: Creates `public.v2_workout_plans`, `public.v2_workout_sessions`, `public.exercise_sets`. Legacy tables (`workouts`, `workout_logs`, `exercise_logs`) remain completely untouched.
2. **State Machine Constraint**:
   `CHECK (state IN ('planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled'))`
3. **Concurrency Safety**:
   `CREATE UNIQUE INDEX idx_v2_workout_sessions_single_active ON public.v2_workout_sessions(user_id) WHERE state IN ('started', 'paused');`
   Prevents concurrent active sessions at the database engine level.
4. **Database-Level State Transition Integrity**:
   Trigger `trg_enforce_workout_session_state_transition` executes `enforce_workout_session_state_transition()`:
   ```sql
   IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
       RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
   END IF;
   ```
   Enforced at the PostgreSQL engine level, not solely in application code.
5. **Foreign Key Integrity**:
   - `session_id UUID REFERENCES public.v2_workout_sessions(id) ON DELETE CASCADE`
   - `exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL`
   - Compatibility verified: `exercise_id` is nullable, and `exercises.id` on staging is confirmed `UUID PRIMARY KEY`.
6. **Grants**: Least privilege grants match canonical STRIVA V2 standard.

---

## 3. SECURITY & TENANT-ISOLATION PREFLIGHT

### 3.1 Helper Function Introspection on Staging
The canonical tenant membership function `public.is_org_member(target_org_id uuid)` was introspected on staging:
```sql
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
```

### 3.2 Policy Matrix & Domain Isolation Evaluation
| Domain & Object | Action | Proposed Policy Logic | Security & Isolation Analysis | Preflight Status |
| :--- | :--- | :--- | :--- | :--- |
| `v2_nutrition_logs` | SELECT / INSERT / UPDATE / DELETE | `auth.uid() = user_id` | **Strict Member Self-Access**: Nutrition data is 100% private to the athlete. Organization staff have NO direct SQL read access. Zero cross-tenant leakage. | **PASS** |
| `v2_daily_nutrition_summary` | SELECT | View `WITH (security_invoker = true)` | **Caller RLS Scoping**: Automatically filtered by underlying table policy `auth.uid() = user_id`. | **PASS** |
| `v2_workout_plans` | SELECT | `auth.uid() = user_id OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))` | **Org-Scoped Sharing**: Member reads own plans; trainers and owners in the assigned org can view shared plans. Cross-tenant access denied (`is_org_member` returns false). | **PASS** |
| `v2_workout_plans` | INSERT / UPDATE / DELETE | `auth.uid() = user_id` | **Read-Only Staff Boundary**: Staff can inspect shared plans, but CANNOT mutate or delete another user's plan. | **PASS** |
| `v2_workout_sessions` | SELECT | `auth.uid() = user_id OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))` | **Training Visibility**: Trainers can monitor live/completed member workouts in their own gym. Cross-tenant reads return 0 rows. | **PASS** |
| `v2_workout_sessions` | INSERT / UPDATE / DELETE | `auth.uid() = user_id` | **Strict Ownership**: Only the session owner can start, transition, or delete their workout session. | **PASS** |
| `exercise_sets` | ALL | Parent session check: `EXISTS (SELECT 1 FROM v2_workout_sessions ws WHERE ws.id = exercise_sets.session_id AND ...)` | **Session Scoping**: Set operations are strictly bound to parent session authorization. Sets cannot be hijacked or read across session boundaries. | **PASS** |
| Anonymous (`anon`) | ALL | `REVOKE ALL FROM PUBLIC, anon;` | **Fail-Closed**: Unauthenticated requests receive `permission denied` at the database level. | **PASS** |
| `service_role` | ALL | `GRANT ALL TO service_role;` | **Administrative Control**: Allowed for background cron, ingestion, and telemetry processing. | **PASS** |

---

## 4. REPOSITORY & APPLICATION COMPATIBILITY

Inspection of backend source code confirms compatibility across all affected components:
1. **Nutrition Repository (`NutritionRepository.ts`)**:
   - Queries and writes `v2_nutrition_logs` with meal-level fields (`meal_type`, `food_name`, `calories`, `protein_g`, `carbs_g`, `fats_g`).
   - Supports multiple meals on the same date.
   - Queries and writes `water_logs` via `profile_id` (UUID), allowing Phase 9B compatibility trigger to manage legacy `user_id` without breaking historical integrity.
2. **Workout Repositories & Execution Service (`V2WorkoutSessionRepository.ts`, `WorkoutPlanRepository.ts`, `WorkoutExecutionService.ts`)**:
   - Targets `v2_workout_plans` and `v2_workout_sessions`.
   - `getActiveSession` queries `state IN ('started', 'paused')`, aligning with the partial unique index.
   - Validates session state transitions and rejects reopening closed sessions.
   - `completeSet` and `logSet` verify parent session ownership, preventing cross-member exercise set leakage.
3. **TRINETRA AI Intelligence Layer (`ContextBuilder.ts`)**:
   - Incorporates explicit `telemetryStatus: { nutritionOnline, workoutOnline }`.
   - Emits observable degradation telemetry (`[Telemetry Offline - database query failed]`) when database errors occur, rather than silently converting failures into fake 0-calorie or empty workout records.
4. **Analytics & Admin Repositories (`AnalyticsRepository.ts`, `AdminRepository.ts`)**:
   - Directed session volume queries to `v2_workout_sessions` and `exercise_sets`.
   - Directed nutrition analytics to `v2_nutrition_logs`.

---

## 5. MIGRATION SEQUENCING & RECOVERY READINESS

### 5.1 Deployment Sequencing Analysis
- **Inter-Migration Dependencies**: **NONE.**
  - Phase 10A depends only on `public.profiles`.
  - Phase 10B depends on `public.profiles`, `public.organizations`, `public.exercises`, and `public.is_org_member()`.
  - Neither migration references tables or objects from the other.
- **Recommended Deployment Order**:
  1. **Phase 10A First**: Deploys nutrition logging and daily aggregation.
  2. **Phase 10B Second**: Deploys workout planning, session lifecycle, and exercise sets.
  - Can be deployed in separate deployment windows under explicit authorization.

### 5.2 Pre-Deployment Checkpoint Requirement
Before applying either migration to staging, a fresh logical backup checkpoint of the staging database must be taken and verified (as executed in DB-3E):
```bash
# Required naming pattern:
striva_staging_checkpoint_pre_phase10a_<timestamp>.sql
```

### 5.3 Rollback Strategy & Data Preservation
Because both migrations are additive, rolling them back in the future cannot simply execute `DROP TABLE ... CASCADE` once live traffic has logged modern records.

**Verified Archive-Before-Drop Procedure**:
```sql
BEGIN;

-- 1. Snapshot post-deployment modern data
CREATE TABLE public.archive_v2_nutrition_logs_<timestamp> AS
SELECT * FROM public.v2_nutrition_logs;

CREATE TABLE public.archive_v2_workout_plans_<timestamp> AS
SELECT * FROM public.v2_workout_plans;

CREATE TABLE public.archive_v2_workout_sessions_<timestamp> AS
SELECT * FROM public.v2_workout_sessions;

CREATE TABLE public.archive_exercise_sets_<timestamp> AS
SELECT * FROM public.exercise_sets;

-- 2. Drop Phase 10B objects
DROP TRIGGER IF EXISTS trg_enforce_workout_session_state_transition ON public.v2_workout_sessions;
DROP FUNCTION IF EXISTS public.enforce_workout_session_state_transition();
DROP TABLE IF EXISTS public.exercise_sets CASCADE;
DROP TABLE IF EXISTS public.v2_workout_sessions CASCADE;
DROP TABLE IF EXISTS public.v2_workout_plans CASCADE;

-- 3. Drop Phase 10A objects
DROP VIEW IF EXISTS public.v2_daily_nutrition_summary CASCADE;
DROP TABLE IF EXISTS public.v2_nutrition_logs CASCADE;

COMMIT;
```
This procedure preserves 100% of modern records, ownership references, macros, weights, reps, and timestamps in durable archive tables while cleanly removing operational schema objects.

---

## 6. PASS / FAIL / UNVERIFIED EVIDENCE TABLE

| Audit Criterion | Verification Method | Evidence / Finding | Status |
| :--- | :--- | :--- | :---: |
| **Staging Project Identity** | Read-only SQL query | Host `db.ymrblyiwohvxptiqjfsi.supabase.co`, DB `postgres`, user `postgres` | **PASS** |
| **PostgreSQL Version** | Read-only SQL query | PostgreSQL 17.6 on aarch64-unknown-linux-gnu | **PASS** |
| **Phase 9B Migration Baseline** | Query `public._migrations` | Present (ID 23, run_at `2026-10-11T22:37:36`) | **PASS** |
| **Hydration Row Count** | Query `public.water_logs` | Exactly 13 rows intact | **PASS** |
| **Legacy Identity Bridge Map** | Query `legacy_user_id_map` | Exactly 2 rows (Legacy 148 & 151 mapped) | **PASS** |
| **Phase 9B Trigger Status** | Query `information_schema.triggers` | `trg_sync_water_logs_compatibility` active on `water_logs` | **PASS** |
| **Clean Phase 10 Target Slate** | Query `information_schema.tables` | 0 Phase 10 tables/views exist on staging | **PASS** |
| **Prerequisite Foreign Key Targets** | Query `information_schema.columns` | `profiles.id`, `organizations.id`, `exercises.id` confirmed `UUID PK` | **PASS** |
| **RLS Helper Functions** | Query `pg_proc` definition | `is_org_member(target_org_id uuid)` confirmed present and matching | **PASS** |
| **Multi-Meal Contract** | Migration SQL inspection | `UNIQUE(user_id, date)` omitted; multiple entries per day supported | **PASS** |
| **Macro Precision & Checks** | Migration SQL inspection | `NUMERIC(6,2)` precision and non-negative constraints enforced | **PASS** |
| **Security Invoker View** | Migration SQL inspection | `WITH (security_invoker = true)` on `v2_daily_nutrition_summary` | **PASS** |
| **Single Active Session Index** | Migration SQL inspection | Partial unique index on `(user_id) WHERE state IN ('started', 'paused')` | **PASS** |
| **Database State Transition Trigger** | Migration SQL inspection | `trg_enforce_workout_session_state_transition` blocks reopening closed sessions | **PASS** |
| **Catalog FK Soft Preservation** | Migration SQL inspection | `exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL` | **PASS** |
| **Runner Advisory Lock & Isolation** | Code inspection | `apply_staging_migrations.js` uses lock `746291048201582` with target filtering | **PASS** |
| **Rollback Archive Protocol** | Disposable PostgreSQL test | 100% of modern records preserved in `archive_` tables | **PASS** |
| **Zero Remote Mutations** | Audit session verification | 0 DDL, 0 DML, 0 backfills, 0 policy changes executed against staging | **PASS** |

---

## 7. DEPLOYMENT RECOMMENDATION

### Phase 10A (Nutrition Core Schema)
- **Recommendation**: **READY FOR EXPLICIT OPERATOR AUTHORIZATION**
- **Risk Level**: **LOW (Additive Only)**
- **Prerequisites**: Fresh pre-migration backup checkpoint export.
- **Target Command**:
  ```bash
  node backend/scripts/apply_staging_migrations.js phase_10a_nutrition_core_schema.sql
  ```

### Phase 10B (Workout Core Schema)
- **Recommendation**: **READY FOR EXPLICIT OPERATOR AUTHORIZATION** (Recommended immediately following Phase 10A)
- **Risk Level**: **LOW (Additive Only)**
- **Prerequisites**: Fresh pre-migration backup checkpoint export; Phase 10A deployed and verified.
- **Target Command**:
  ```bash
  node backend/scripts/apply_staging_migrations.js phase_10b_workout_core_schema.sql
  ```

---

## 8. BLOCKERS & REQUIRED REMEDIATIONS

There are **zero technical blockers** preventing deployment of Phase 10A or Phase 10B.

**Required Operational Pre-Flight Remediations (Before Deployment Execution)**:
1. **Operator Authorization**: Deployment to staging requires explicit operator approval for Phase 10A and Phase 10B.
2. **Pre-Migration Checkpoint Export**: Must execute a read-only logical export checkpoint of staging (`ymrblyiwohvxptiqjfsi`) prior to executing the migration runner.
3. **Sequential Staging Execution**: Deploy Phase 10A first, verify migration entry #24 in `_migrations`, then deploy Phase 10B and verify migration entry #25.

---

## 9. CONFIRMATION OF ZERO REMOTE MUTATIONS

- **Remote Database**: Supabase Staging Reference `ymrblyiwohvxptiqjfsi`
- **Total Remote DDL Executed**: **0**
- **Total Remote DML Executed**: **0**
- **Total Policy Changes Executed**: **0**
- **Staging Database State**: **Phase 9B remains deployed and 100% unchanged.**
- **Production Database State**: **Untouched.**

---

## HALT CONDITION
Read-only staging preflight audit for **DB-4D** is complete. Stopping execution. Awaiting operator review and explicit authorization before any staging migration deployment.
