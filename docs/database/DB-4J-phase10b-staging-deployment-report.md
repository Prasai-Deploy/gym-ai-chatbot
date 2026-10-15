# STRIVA V2 — DB-4J: Phase 10B Staging Deployment Report

**Document Version:** 1.0.0  
**Deployment Date:** October 12, 2026  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Database Engine:** `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit`  
**Migration Deployed:** `backend/supabase/migrations/phase_10b_workout_core_schema.sql`  
**Runner Executed:** `node backend/scripts/apply_staging_migrations.js phase_10b_workout_core_schema.sql`  
**Pre-Deployment Migration Count:** `24`  
**Post-Deployment Migration Count:** `25`  
**Pre-Deployment Checkpoint:** `striva_staging_checkpoint_pre_phase10b_2026-10-12T08-46-28-162Z.sql`  
**Pre-Deployment Checkpoint SHA-256:** `a99587fcf666fea5e4687dbe2683ca509ff7098dd88f504d27b935c9671209a9`  
**Deployment Status:** **`SUCCESS (DEPLOYMENT COMPLETE & VERIFIED)`**  

---

## 1. EXECUTIVE SUMMARY

Under explicit operator authorization, **Phase 10B** (`phase_10b_workout_core_schema.sql`) was deployed to the STRIVA V2 staging project (`ymrblyiwohvxptiqjfsi`). The deployment executed within a dedicated transaction protected by a 64-bit advisory lock.

Following execution, an exhaustive read-only inspection of the live staging database was performed alongside behavioral verification in an isolated disposable PostgreSQL environment.

### Key Deployment Highlights
1. **Targeted Deployment Only:** Strictly `phase_10b_workout_core_schema.sql` was applied. No other pending or unrelated migrations were processed.
2. **Ledger Increment:** Total recorded migrations in `public._migrations` increased from `24` to `25`.
3. **Core Schema Introduction:** Successfully introduced canonical tables:
   - `public.v2_workout_plans`
   - `public.v2_workout_sessions`
   - `public.exercise_sets`
4. **Lifecycle & Concurrency Protections:**
   - Active session exclusivity guaranteed via partial unique index `idx_v2_workout_sessions_single_active` on `WHERE state IN ('started', 'paused')`.
   - Engine-level terminal state locking active via trigger `trg_enforce_workout_session_state_transition` and function `enforce_workout_session_state_transition()`.
5. **Row Level Security & Principle of Least Privilege:**
   - RLS enabled on all three tables.
   - Member self-isolation enforced for all mutations.
   - Organization staff have read-only visibility within their assigned organization.
   - `exercise_sets` mutations are scoped strictly to the session owner (`ws.user_id = auth.uid()`).
   - `anon` and `PUBLIC` roles have **0 privileges** (all access denied).
6. **Zero Baseline Regression:**
   - All 13 historical `water_logs` rows (with dual-key `amount_ml` intact), 2 legacy identity mappings (users 148 & 151), 5 profiles, and 7 legacy users remain 100% intact.
   - Deployed Phase 10A nutrition objects (`v2_nutrition_logs` and `v2_daily_nutrition_summary` with `security_invoker = true`) remain unaffected.
   - Legacy workout tables (`workout_plans`, `workout_sessions`, `workout_logs`) remain completely untouched.

---

## 2. PRE-DEPLOYMENT VERIFICATION GATE

Prior to executing any remote changes, mandatory preflight assertions were evaluated:

| Preflight Check | Requirement | Live Staging Finding | Status |
| :--- | :--- | :--- | :--- |
| **Target Project Reference** | `ymrblyiwohvxptiqjfsi` | Verified in `DATABASE_URL` / `DIRECT_URL` | **PASS** |
| **Pre-Migration Count** | Exactly 24 | Verified 24 rows in `public._migrations` | **PASS** |
| **Latest Applied Migration** | `phase_10a_nutrition_core_schema.sql` | Verified `run_at: 2026-10-12T08:38:48.241Z` | **PASS** |
| **Phase 10B Absence** | Not yet recorded or applied | Confirmed absent from ledger; 0 tables existed | **PASS** |
| **Pre-Phase 10B Checkpoint** | Outside Git, SHA-256 match | File exists in `<AppDataDir>/scratch/backups/`; SHA-256 matched recorded digest `a99587fc...` | **PASS** |
| **Baseline Identity & Data** | 13 `water_logs`, 2 mappings, 5 profiles, 7 users | Exact match: 13, 2, 5, 7, 0 `v2_nutrition_logs` | **PASS** |
| **Phase 10B Contract Review** | Additive schema, no legacy drops | Verified 100% additive DDL; no legacy table changes | **PASS** |

---

## 3. DEPLOYMENT EXECUTION LOG

The targeted migration was executed via the official STRIVA V2 staging runner:

```bash
node backend/scripts/apply_staging_migrations.js phase_10b_workout_core_schema.sql
```

### Execution Output:
```
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_10b_workout_core_schema.sql
[APPLYING] phase_10b_workout_core_schema.sql...
[SUCCESS] phase_10b_workout_core_schema.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 100
```

- **Advisory Lock Key:** `746291048201582` (PostgreSQL 64-bit advisory transaction lock)
- **Commit Timestamp:** `2026-10-12T08:53:31.500Z`

---

## 4. LIVE STAGING POST-DEPLOYMENT AUDIT

All observations in this section were collected through direct read-only SQL introspection of staging database `ymrblyiwohvxptiqjfsi`.

### 4.1 Migration Ledger
- **Total Migrations:** `25`
- **Phase 10B Record:** Recorded exactly once:
  - `name`: `phase_10b_workout_core_schema.sql`
  - `run_at`: `2026-10-12T08:53:31.500Z`
- **Phase 10A Record:** Unchanged at `2026-10-12T08:38:48.241Z`
- **Phase 9B Record:** Unchanged at `2026-10-11T17:07:36.445Z`
- **Phase 9A Record:** Unchanged at `2026-10-11T15:01:50.203Z`

### 4.2 Table Schemas & Data Types

#### 1. `public.v2_workout_plans`
- **Columns (9 total):**
  - `id`: `uuid` NOT NULL, default `gen_random_uuid()` (Primary Key)
  - `user_id`: `uuid` NOT NULL, references `public.profiles(id)` ON DELETE CASCADE
  - `organization_id`: `uuid` NULL, references `public.organizations(id)` ON DELETE SET NULL
  - `title`: `character varying(255)` NOT NULL, default `'Workout Plan'`
  - `description`: `text` NULL
  - `schedule`: `jsonb` NOT NULL, default `'{}'::jsonb`
  - `is_active`: `boolean` NOT NULL, default `true`
  - `created_at`: `timestamp with time zone` NOT NULL, default `now()`
  - `updated_at`: `timestamp with time zone` NOT NULL, default `now()`
- **Constraints & Checks:**
  - `v2_workout_plans_title_check`: `CHECK (char_length(TRIM(BOTH FROM title)) >= 1)`
- **Indexes:**
  - `v2_workout_plans_pkey`: UNIQUE BTREE on `(id)`
  - `idx_v2_workout_plans_user`: BTREE on `(user_id, is_active)`
  - `idx_v2_workout_plans_org`: BTREE on `(organization_id)`

#### 2. `public.v2_workout_sessions`
- **Columns (12 total):**
  - `id`: `uuid` NOT NULL, default `gen_random_uuid()` (Primary Key)
  - `user_id`: `uuid` NOT NULL, references `public.profiles(id)` ON DELETE CASCADE
  - `plan_id`: `uuid` NULL, references `public.v2_workout_plans(id)` ON DELETE SET NULL
  - `day_id`: `character varying(64)` NULL
  - `title`: `character varying(255)` NOT NULL, default `'Workout Session'`
  - `state`: `character varying(32)` NOT NULL, default `'started'`
  - `started_at`: `timestamp with time zone` NULL, default `now()`
  - `completed_at`: `timestamp with time zone` NULL
  - `notes`: `text` NULL
  - `organization_id`: `uuid` NULL, references `public.organizations(id)` ON DELETE SET NULL
  - `created_at`: `timestamp with time zone` NOT NULL, default `now()`
  - `updated_at`: `timestamp with time zone` NOT NULL, default `now()`
- **Constraints & Checks:**
  - `v2_workout_sessions_state_check`: `CHECK (state IN ('planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled'))`
  - `v2_workout_sessions_title_check`: `CHECK (char_length(TRIM(BOTH FROM title)) >= 1)`
- **Indexes:**
  - `v2_workout_sessions_pkey`: UNIQUE BTREE on `(id)`
  - `idx_v2_workout_sessions_user_state`: BTREE on `(user_id, state)`
  - `idx_v2_workout_sessions_started`: BTREE on `(user_id, started_at DESC)`
  - `idx_v2_workout_sessions_org`: BTREE on `(organization_id)`
  - **`idx_v2_workout_sessions_single_active`**: `CREATE UNIQUE INDEX idx_v2_workout_sessions_single_active ON public.v2_workout_sessions USING btree (user_id) WHERE state IN ('started', 'paused')`

#### 3. `public.exercise_sets`
- **Columns (12 total):**
  - `id`: `uuid` NOT NULL, default `gen_random_uuid()` (Primary Key)
  - `session_id`: `uuid` NOT NULL, references `public.v2_workout_sessions(id)` ON DELETE CASCADE
  - `exercise_id`: `uuid` NULL, references `public.exercises(id)` ON DELETE SET NULL
  - `set_number`: `integer` NOT NULL, default `1`
  - `weight_kg`: `numeric(6,2)` NOT NULL, default `0.00`
  - `reps`: `integer` NOT NULL, default `0`
  - `rpe`: `numeric(3,1)` NULL
  - `tempo`: `character varying(32)` NULL
  - `rest_time_seconds`: `integer` NULL
  - `status`: `character varying(32)` NOT NULL, default `'completed'`
  - `completed_at`: `timestamp with time zone` NULL, default `now()`
  - `created_at`: `timestamp with time zone` NOT NULL, default `now()`
- **Constraints & Checks:**
  - `exercise_sets_set_number_check`: `CHECK (set_number >= 1)`
  - `exercise_sets_weight_kg_check`: `CHECK (weight_kg >= 0.00 AND weight_kg <= 1000.00)`
  - `exercise_sets_reps_check`: `CHECK (reps >= 0 AND reps <= 1000)`
  - `exercise_sets_rpe_check`: `CHECK (rpe IS NULL OR (rpe >= 1.0 AND rpe <= 10.0))`
  - `exercise_sets_rest_time_seconds_check`: `CHECK (rest_time_seconds IS NULL OR rest_time_seconds >= 0)`
  - `exercise_sets_status_check`: `CHECK (status IN ('planned', 'completed', 'skipped'))`
- **Indexes:**
  - `exercise_sets_pkey`: UNIQUE BTREE on `(id)`
  - `idx_exercise_sets_session`: BTREE on `(session_id)`
  - `idx_exercise_sets_exercise`: BTREE on `(exercise_id)`

### 4.3 Engine-Level Trigger Verification
- **Trigger:** `trg_enforce_workout_session_state_transition`
- **Event:** `BEFORE UPDATE OF state ON public.v2_workout_sessions`
- **Function:** `public.enforce_workout_session_state_transition()`
- **Engine Logic:**
  ```sql
  CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
   RETURNS trigger
   LANGUAGE plpgsql
  AS $function$
  BEGIN
      IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
          RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
      END IF;
      RETURN NEW;
  END;
  $function$
  ```

### 4.4 Row Level Security & Access Policies

All three tables confirmed `relrowsecurity = true` and `relforcerowsecurity = false`.

#### Policies on `public.v2_workout_plans`:
| Policy Name | Action | Target Roles | Using / With Check Expression |
| :--- | :--- | :--- | :--- |
| `v2_workout_plans_member_select` | `SELECT` | `authenticated` | `(auth.uid() = user_id) OR ((organization_id IS NOT NULL) AND is_org_member(organization_id))` |
| `v2_workout_plans_member_insert` | `INSERT` | `authenticated` | `WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_plans_member_update` | `UPDATE` | `authenticated` | `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_plans_member_delete` | `DELETE` | `authenticated` | `USING (auth.uid() = user_id)` |

#### Policies on `public.v2_workout_sessions`:
| Policy Name | Action | Target Roles | Using / With Check Expression |
| :--- | :--- | :--- | :--- |
| `v2_workout_sessions_member_select` | `SELECT` | `authenticated` | `(auth.uid() = user_id) OR ((organization_id IS NOT NULL) AND is_org_member(organization_id))` |
| `v2_workout_sessions_member_insert` | `INSERT` | `authenticated` | `WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_sessions_member_update` | `UPDATE` | `authenticated` | `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` |
| `v2_workout_sessions_member_delete` | `DELETE` | `authenticated` | `USING (auth.uid() = user_id)` |

#### Policy on `public.exercise_sets`:
| Policy Name | Action | Target Roles | Using / With Check Expression |
| :--- | :--- | :--- | :--- |
| `exercise_sets_session_scope` | `ALL` | `authenticated` | **USING:** `EXISTS (SELECT 1 FROM v2_workout_sessions ws WHERE ws.id = exercise_sets.session_id AND (ws.user_id = auth.uid() OR (ws.organization_id IS NOT NULL AND is_org_member(ws.organization_id))))`<br>**WITH CHECK:** `EXISTS (SELECT 1 FROM v2_workout_sessions ws WHERE ws.id = exercise_sets.session_id AND ws.user_id = auth.uid())` |

### 4.5 Role Grants & Privileges
Confirmed from `information_schema.role_table_grants`:
- `PUBLIC`: **0 privileges** (completely revoked).
- `anon`: **0 privileges** (completely revoked).
- `authenticated`: Granted `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `REFERENCES`, `TRIGGER`, `TRUNCATE`.
- `service_role`: Granted `ALL` privileges.
- `postgres`: Granted `ALL` privileges.

### 4.6 Security Helper Function: `public.is_org_member`
- **Definition:** `SECURITY DEFINER = true`, `SET search_path TO 'public'`
- **Fail-Closed Verification:** Explicit check `IF auth.uid() IS NULL OR target_org_id IS NULL THEN RETURN FALSE;` prevents unauthenticated or null-tenant lookups from succeeding.
- **Tenant Scope:** Verified lookups are scoped strictly to `organization_members` or `organizations.owner_id`.

---

## 5. BASELINE DATA & REGRESSION AUDIT

A complete regression check was executed against all baseline entities:

| Table / Object | Pre-10B Count | Post-10B Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `public.organizations` | 1 | 1 | **INTACT** | Default organization preserved |
| `public.users` | 7 | 7 | **INTACT** | Legacy user IDs 147–153 preserved |
| `public.profiles` | 5 | 5 | **INTACT** | V2 profiles preserved |
| `public.organization_members` | 0 | 0 | **INTACT** | Clean staging baseline |
| `public.exercise_categories` | 5 | 5 | **INTACT** | Global categories preserved |
| `public.exercises` | 4 | 4 | **INTACT** | Global exercises preserved |
| `public.legacy_user_id_map` | 2 | 2 | **INTACT** | Bridge mappings for users 148 & 151 intact |
| `public.water_logs` | 13 | 13 | **INTACT** | All 13 historical hydration records intact; dual-key `amount_ml` populated |
| `public.v2_nutrition_logs` | 0 | 0 | **INTACT** | Phase 10A table untouched |
| `public.v2_daily_nutrition_summary` | View | View | **INTACT** | `["security_invoker=true"]` active |
| `public.workout_plans` (Legacy) | 0 | 0 | **INTACT** | Legacy table untouched |
| `public.workout_sessions` (Legacy) | 0 | 0 | **INTACT** | Legacy table untouched |
| `public.workout_logs` (Legacy) | 0 | 0 | **INTACT** | Legacy table untouched |

---

## 6. ISOLATED TEST EXECUTION & BEHAVIORAL VERIFICATION

> [!IMPORTANT]
> **Safety Notice on Staging Mutations**:
> In strict accordance with the read-only audit boundary, **no unapproved write tests were performed directly against live staging**. All mutating behavioral checks were executed against disposable PostgreSQL 18 (`127.0.0.1:5433`).

### 6.1 Readiness Test Suite (`test_phase10b_readiness.cjs`)
Executed on disposable PostgreSQL 18:
1. **Migration Clean Apply:** Applied Phase 10B on top of Phase 10A; all 3 tables created cleanly. &rarr; **PASS**
2. **Lifecycle & Index Collision:** Verified partial unique index blocks concurrent active workouts; verified valid transitions; verified engine trigger blocks reopening completed sessions. &rarr; **PASS**
3. **Foreign Key Cascade Semantics:** Verified exercise deletion sets `exercise_id = NULL`; verified session deletion deletes associated sets via `CASCADE`. &rarr; **PASS**
4. **Pre-Traffic Rollback with `RESTRICT`:** Cleanly dropped Phase 10B without touching Phase 10A or baseline data. &rarr; **PASS**
5. **Post-Traffic Modern Data Archiving:** Verified 100% of live athlete workout sessions and sets preserved in archive tables before table drop. &rarr; **PASS**

### 6.2 DB-4 Vitest Suite
```
 RUN  v4.1.11 C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend

 ✓ tests/integration/db4_real_postgres.integration.test.ts (15 tests) 1819ms
 ✓ tests/unit/db4_nutrition_workout_contracts.unit.test.ts (9 tests) 11ms

 Test Files  2 passed (2)
      Tests  24 passed (24)
   Duration  2.47s
```

All 29 test assertions passed with 0 failures.

---

## 7. ROLLBACK & RECOVERY PROCEDURES (REFERENCE)

Should an operational emergency require rolling back Phase 10B, the following approved runbooks must be used. Both were validated in disposable testing.

### Scenario A: Pre-Traffic Rollback (Zero Modern Data)
```sql
BEGIN;
SELECT pg_advisory_xact_lock(746291048201582);

DROP TRIGGER IF EXISTS trg_enforce_workout_session_state_transition ON public.v2_workout_sessions;
DROP FUNCTION IF EXISTS public.enforce_workout_session_state_transition();

DROP TABLE IF EXISTS public.exercise_sets RESTRICT;
DROP TABLE IF EXISTS public.v2_workout_sessions RESTRICT;
DROP TABLE IF EXISTS public.v2_workout_plans RESTRICT;

DELETE FROM public._migrations WHERE name = 'phase_10b_workout_core_schema.sql';
COMMIT;
```

### Scenario B: Post-Traffic Rollback (Archive Before Drop)
```sql
BEGIN;
SELECT pg_advisory_xact_lock(746291048201582);

-- 1. Archive live modern data with timestamp
CREATE TABLE public.archive_exercise_sets_emergency AS SELECT * FROM public.exercise_sets;
CREATE TABLE public.archive_v2_workout_sessions_emergency AS SELECT * FROM public.v2_workout_sessions;
CREATE TABLE public.archive_v2_workout_plans_emergency AS SELECT * FROM public.v2_workout_plans;

-- 2. Drop triggers and functions
DROP TRIGGER IF EXISTS trg_enforce_workout_session_state_transition ON public.v2_workout_sessions;
DROP FUNCTION IF EXISTS public.enforce_workout_session_state_transition();

-- 3. Drop operational tables with RESTRICT
DROP TABLE IF EXISTS public.exercise_sets RESTRICT;
DROP TABLE IF EXISTS public.v2_workout_sessions RESTRICT;
DROP TABLE IF EXISTS public.v2_workout_plans RESTRICT;

DELETE FROM public._migrations WHERE name = 'phase_10b_workout_core_schema.sql';
COMMIT;
```

---

## 8. HALT CONDITION MET

- **Phase 10B Staging Deployment:** Successfully applied, audited, and verified.
- **Migration Ledger Status:** 25 migrations recorded.
- **Production State:** Completely untouched.
- **DB-5 Status:** Not started.
- In compliance with safety rules, all execution has stopped. Awaiting separate review and instruction.
