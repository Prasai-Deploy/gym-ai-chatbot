# STRIVA V2 — DB-4I: Phase 10A Post-Deployment Audit & Phase 10B Readiness Preflight Report

**Document Version:** 1.0.0  
**Audit & Preflight Date:** October 12, 2026  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Database Engine:** `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit`  
**Current Migration Count:** `24`  
**Latest Deployed Migration:** `phase_10a_nutrition_core_schema.sql`  
**Phase 10B Candidate:** `backend/supabase/migrations/phase_10b_workout_core_schema.sql`  
**Fresh Pre-Phase-10B Checkpoint:** `striva_staging_checkpoint_pre_phase10b_2026-10-12T08-46-28-162Z.sql`  
**Fresh Pre-Phase-10B Checkpoint SHA-256:** `a99587fcf666fea5e4687dbe2683ca509ff7098dd88f504d27b935c9671209a9`  
**Overall Preflight Status:** **`PASS (RECOMMENDED FOR SEPARATE PHASE 10B DEPLOYMENT AUTHORIZATION)`**  

---

## 1. EXECUTIVE SUMMARY

Following the deployment of Phase 10A, a comprehensive read-only audit of the live STRIVA V2 staging database (`ymrblyiwohvxptiqjfsi`) was performed alongside an architectural and safety preflight review of the upcoming **Phase 10B** workout schema migration.

**Key Findings:**
1. **Phase 10A Post-Deployment State Confirmed:** Migration ledger contains exactly 24 entries. `public.v2_nutrition_logs` exists with all canonical columns, constraints, foreign key to `profiles(id)`, and strict member self-isolation RLS. The daily aggregation view `public.v2_daily_nutrition_summary` enforces `security_invoker = true`. Anonymous access is completely denied.
2. **Baseline Stability:** All 13 historical `water_logs` rows, 2 verified identity bridge mappings, 5 profiles, and 7 legacy users remain intact with zero drift.
3. **Phase 10B Absence:** Verified 0 Phase 10B tables, indexes, or migration entries currently exist on staging.
4. **Phase 10B Readiness:** Schema contracts, lifecycle transitions (`started` &harr; `paused` &rarr; `completed`), single-active session constraints, engine-level terminal state protection, tenant boundaries, and rollback runbooks were verified with a 100% pass rate on disposable PostgreSQL 18.
5. **Fresh Pre-Phase-10B Checkpoint Created:** Checkpoint `striva_staging_checkpoint_pre_phase10b_2026-10-12T08-46-28-162Z.sql` (24,981 bytes) was captured, cryptographically hashed, and verified on disposable PostgreSQL.

> [!NOTE]
> **Preflight Boundary**:
> This preflight confirms Phase 10B readiness and issues a technical recommendation. It does **not** constitute deployment authorization and does not claim production readiness. Phase 10B deployment requires separate, explicit operator authorization.

---

## 2. PHASE 10A LIVE POST-DEPLOYMENT AUDIT

All observations below were gathered using read-only SQL queries against staging project `ymrblyiwohvxptiqjfsi`:

### 2.1 Migration Ledger
- **Applied Migration Count:** Exactly `24` entries.
- **Phase 10A Ledger Status:** `phase_10a_nutrition_core_schema.sql` recorded exactly once with execution timestamp `2026-10-12T08:38:49.000Z`.
- **Phase 10B Ledger Status:** `phase_10b_workout_core_schema.sql` is **absent** from `_migrations`.

### 2.2 Table Architecture: `public.v2_nutrition_logs`
- **Columns (12 total):** `id` (UUID PK), `user_id` (UUID FK), `date` (DATE), `meal_type` (VARCHAR(32)), `food_name` (TEXT), `calories` (INT4), `protein_g` (NUMERIC(6,2)), `carbs_g` (NUMERIC(6,2)), `fats_g` (NUMERIC(6,2)), `notes` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
- **Foreign Key:** `v2_nutrition_logs_user_id_fkey` &rarr; `FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`.
- **Macro Range Check Constraints:**
  - `calories`: `CHECK (calories >= 0 AND calories <= 20000)`
  - `protein_g`: `CHECK (protein_g >= 0.00 AND protein_g <= 1000.00)`
  - `carbs_g`: `CHECK (carbs_g >= 0.00 AND carbs_g <= 1000.00)`
  - `fats_g`: `CHECK (fats_g >= 0.00 AND fats_g <= 1000.00)`
  - `meal_type`: `CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'))`
  - `food_name`: `CHECK (char_length(trim(food_name)) >= 1)`
- **Multiple Meals per Date:** Confirmed **0 uniqueness constraints** on `(user_id, date)`. Multiple meals per athlete per date are fully supported.
- **Indexes:** BTREE indexes on `(user_id, date)` and `(user_id, created_at DESC)`.

### 2.3 Aggregation View: `public.v2_daily_nutrition_summary`
- **Aggregation Columns:** `user_id`, `date`, `total_calories`, `total_protein_g`, `total_carbs_g`, `total_fats_g`, `meal_count`, `first_logged_at`, `last_logged_at`.
- **Security Invoker:** Option `["security_invoker=true"]` confirmed in PostgreSQL catalog. Queries against the view invoke underlying table RLS for the calling user, preventing bypass of table access controls.

### 2.4 Row Level Security & Privileges
- **RLS Status:** `relrowsecurity = true` on `public.v2_nutrition_logs`.
- **Member Self-Isolation Policies:**
  - `v2_nutrition_member_select`: `FOR SELECT TO authenticated USING (auth.uid() = user_id)`
  - `v2_nutrition_member_insert`: `FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`
  - `v2_nutrition_member_update`: `FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
  - `v2_nutrition_member_delete`: `FOR DELETE TO authenticated USING (auth.uid() = user_id)`
- **Access Boundary:**
  - Members cannot view or mutate another member's meal logs.
  - Zero policies exist granting gym owners or trainers broad access to athlete nutrition logs.
  - Anonymous (`anon`) and `PUBLIC` roles have **0 privileges** (access denied).

### 2.5 Phase 9A & 9B Baseline Preservation
- `public.organizations`: **1**
- `public.users`: **7** (Legacy IDs 147–153)
- `public.profiles`: **5**
- `public.organization_members`: **0**
- `public.exercise_categories`: **5**
- `public.exercises`: **4**
- `public.legacy_user_id_map`: **2** (Mappings for legacy IDs 148 & 151 intact)
- `public.water_logs`: **13** (100% of historical records intact; `amount_ml` dual-key populated)
- Sequences: `water_logs_id_seq` = 18 (`is_called = true`), `users_id_seq` = 153 (`is_called = true`).
- Transitional compatibility trigger `trg_sync_water_logs_compatibility` active.

---

## 3. PHASE 10B ARCHITECTURAL & SAFETY REVIEW

### 3.1 Schema & Identity Architecture
File reviewed: `backend/supabase/migrations/phase_10b_workout_core_schema.sql`

1. **`public.v2_workout_plans`**:
   - `id`: UUID Primary Key (`gen_random_uuid()`)
   - `user_id`: UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE CASCADE
   - `organization_id`: UUID NULL REFERENCES `public.organizations(id)` ON DELETE SET NULL
   - `schedule`: JSONB NOT NULL DEFAULT `'{}'::jsonb`
2. **`public.v2_workout_sessions`**:
   - `id`: UUID Primary Key (`gen_random_uuid()`)
   - `user_id`: UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE CASCADE
   - `plan_id`: UUID NULL REFERENCES `public.v2_workout_plans(id)` ON DELETE SET NULL
   - `organization_id`: UUID NULL REFERENCES `public.organizations(id)` ON DELETE SET NULL
   - `state`: VARCHAR(32) NOT NULL DEFAULT `'started'`
3. **`public.exercise_sets`**:
   - `id`: UUID Primary Key (`gen_random_uuid()`)
   - `session_id`: UUID NOT NULL REFERENCES `public.v2_workout_sessions(id)` ON DELETE CASCADE
   - `exercise_id`: UUID NULL REFERENCES `public.exercises(id)` ON DELETE SET NULL (preserves performance history if exercises are deleted)
4. **Legacy Preservation:**
   - Zero modifications or drops to legacy workout tables (`workout_plans`, `workout_sessions`, `workout_logs`).

### 3.2 Workout Execution Lifecycle
- **Supported State Flow:**
  - `planned` &rarr; `ready` &rarr; `started`
  - `started` &harr; `paused`
  - `started` &rarr; `completed`, `abandoned`, or `cancelled`
- **Single-Active Session Guarantee:**
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_workout_sessions_single_active
  ON public.v2_workout_sessions(user_id)
  WHERE state IN ('started', 'paused');
  ```
  Prevents athletes from running multiple concurrent active workouts, while allowing unlimited historical completed workouts.
- **Engine-Level Terminal State Enforcement:**
  Trigger `trg_enforce_workout_session_state_transition` rejects reopening terminal workouts:
  ```sql
  IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
      RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
  END IF;
  ```

### 3.3 Tenant Isolation & RLS Boundary
- **Plans & Sessions Read Policy:**
  `(auth.uid() = user_id OR (organization_id IS NOT NULL AND public.is_org_member(organization_id)))`
  - Member can view own workout.
  - Authorized trainers/owners within the assigned organization can view the workout session.
  - Cross-organization staff access is strictly blocked.
- **Plans & Sessions Mutation Policy:**
  `auth.uid() = user_id` for INSERT, UPDATE, DELETE.
  - Trainers/owners have **read-only** visibility and **cannot mutate** athlete workout sessions or plans.
- **Exercise Sets Policy (`exercise_sets_session_scope`):**
  - Read: Scoped via associated session (`session.user_id = auth.uid() OR is_org_member(session.organization_id)`).
  - Write (`WITH CHECK`): Scoped strictly to `session.user_id = auth.uid()`. Only the athlete can record or edit their own sets.
- **Privilege Hardening:**
  `PUBLIC` and `anon` revoked on all three tables. `authenticated` and `service_role` granted least-privilege permissions.

### 3.4 Migration Runner & Recovery Readiness
- **Runner Registration:** Registered as item 15 in `backend/scripts/apply_staging_migrations.js`.
- **Lock Protection:** Acquired via 64-bit advisory lock `746291048201582`.
- **Pre-Traffic Rollback (Deployment Failure):**
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
- **Post-Traffic Emergency Rollback:**
  Mandates archive-before-drop (`archive_exercise_sets_<timestamp>`, `archive_v2_workout_sessions_<timestamp>`, `archive_v2_workout_plans_<timestamp>`) before dropping operational tables with `RESTRICT`.

---

## 4. ISOLATED TEST EXECUTION & RESULTS

Executed against isolated disposable PostgreSQL 18 (`127.0.0.1:5433`):

### 4.1 Phase 10B Specific Readiness Suite (`test_phase10b_readiness.cjs`)
1. **Migration Clean Apply:** Applied Phase 10B on top of Phase 10A; all 3 tables created cleanly. &rarr; **PASS**
2. **Lifecycle & Index Collision:** Verified partial unique index blocks concurrent active workouts; verified valid transitions; verified engine trigger blocks reopening completed sessions. &rarr; **PASS**
3. **Foreign Key Cascade Semantics:** Verified exercise deletion sets `exercise_id = NULL`; verified session deletion deletes associated sets via `CASCADE`. &rarr; **PASS**
4. **Pre-Traffic Rollback with `RESTRICT`:** Cleanly dropped Phase 10B without touching Phase 10A or baseline data. &rarr; **PASS**
5. **Post-Traffic Modern Data Archiving:** Verified 100% of live athlete workout sessions and sets preserved in archive tables before table drop. &rarr; **PASS**

### 4.2 Comprehensive DB-4 Vitest Suite
```
 RUN  v4.1.11 C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend

 ✓ tests/integration/db4_real_postgres.integration.test.ts (15 tests) 2021ms
 ✓ tests/integration/db4g_checkpoint_validation.integration.test.ts (5 tests) 486ms
 ✓ tests/integration/phase10a_recovery_validation.integration.test.ts (5 tests) 363ms
 ✓ tests/unit/db4_nutrition_workout_contracts.unit.test.ts (9 tests) 10ms

 Test Files  4 passed (4)
      Tests  34 passed (34)
   Duration  3.89s
```
All 34 tests passed with zero failures.

---

## 5. FRESH PRE-PHASE-10B CHECKPOINT

A fresh pre-migration logical checkpoint was captured from live staging following Phase 10A deployment:

| Attribute | SQL Checkpoint Artifact | JSON Manifest Artifact |
| :--- | :--- | :--- |
| **Filename** | [`striva_staging_checkpoint_pre_phase10b_2026-10-12T08-46-28-162Z.sql`](file:///C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/backups/striva_staging_checkpoint_pre_phase10b_2026-10-12T08-46-28-162Z.sql) | [`striva_staging_checkpoint_manifest_pre_phase10b_2026-10-12T08-46-28-162Z.json`](file:///C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/backups/striva_staging_checkpoint_manifest_pre_phase10b_2026-10-12T08-46-28-162Z.json) |
| **Storage Directory** | `<AppDataDir>/scratch/backups/` | `<AppDataDir>/scratch/backups/` |
| **Capture Time (UTC)** | `2026-10-12T08:46:28.162Z` | `2026-10-12T08:46:28.162Z` |
| **Current WAL LSN** | `6/9E000060` (`in_recovery: false`) | `6/9E000060` |
| **File Size** | `24,981 bytes` | `4,188 bytes` |
| **SHA-256 Digest** | `a99587fcf666fea5e4687dbe2683ca509ff7098dd88f504d27b935c9671209a9` | Verified in manifest |
| **Replay Test Status** | **100% PASSED (Disposable PostgreSQL 18)** | **VERIFIED** |

### Checkpoint Scope & Exclusions
- **Included Scope:** Logical DML snapshot of 24 applied migrations (including Phase 10A), `water_logs` (13 rows), `legacy_user_id_map` (2 rows), `profiles` (5 rows), `users` (7 rows), `organizations` (1 row), `exercises` (4 rows), `exercise_categories` (5 rows), `v2_nutrition_logs` (0 rows), and sequence states. Topologically ordered with `ON CONFLICT DO NOTHING`.
- **Explicit Exclusions:** DDL schema definitions, RLS policies, triggers, grants, role ownership, and Supabase internal catalogs (`auth`, `storage`, `vault`). Checkpoint does not replace Supabase PITR.

---

## 6. BLOCKERS, DISCREPANCIES, & RISK AUDIT

- **Blockers Identified:** **`0`**
- **Discrepancies:** None. All repository models (`WorkoutPlanRepository`, `V2WorkoutSessionRepository`) and database contracts align 100%.
- **Security Risks:** None. RLS policies enforce member self-isolation while permitting read-only tenant supervision by staff. Mutation is restricted to the session owner.
- **Rollback Safety:** Rollback procedures use narrow `RESTRICT` commands and mandate archival before table drops.

---

## 7. RECOMMENDATION

**Recommendation:** **`PASS` — Recommended for separate Phase 10B deployment authorization.**

- **Target Migration:** `backend/supabase/migrations/phase_10b_workout_core_schema.sql`
- **Expected Migration Ledger Impact:** Count advances from 24 to 25.
- **Verified Pre-Migration Checkpoint:** `striva_staging_checkpoint_pre_phase10b_2026-10-12T08-46-28-162Z.sql` (SHA-256: `a99587fcf666fea5e4687dbe2683ca509ff7098dd88f504d27b935c9671209a9`).

### Targeted Deployment Command (Awaiting Operator Authorization)
```bash
node backend/scripts/apply_staging_migrations.js phase_10b_workout_core_schema.sql
```

---

## 8. HALT CONDITION MET

Phase 10A audit and Phase 10B readiness preflight are complete.
- **Phase 10B has NOT been deployed.**
- **DB-5 and unrelated tasks have NOT been initiated.**
- Execution has stopped awaiting operator review and explicit authorization.
