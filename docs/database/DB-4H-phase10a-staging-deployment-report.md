# STRIVA V2 — DB-4H: Phase 10A Staging Deployment Report

**Document Version:** 1.0.0  
**Deployment Date:** October 12, 2026  
**Execution Timestamp (UTC):** `2026-10-12T08:38:48Z`  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Target Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Database Engine:** `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit`  
**Pre-Deployment Checkpoint Reference:** `striva_staging_checkpoint_pre_phase10a_2026-10-12T06-11-17-818Z.sql`  
**Pre-Deployment Checkpoint SHA-256:** `82ee3a15e4eb781abaf9d45827ca40a2d0d99fcf0ce2f22bf587813c0f551096`  
**Deployed Migration Candidate:** `backend/supabase/migrations/phase_10a_nutrition_core_schema.sql`  
**Deployment Outcome:** **`PASS`**  

---

## 1. EXECUTIVE SUMMARY

Under explicit operator authorization, **Phase 10A only** (`phase_10a_nutrition_core_schema.sql`) was deployed to the STRIVA V2 staging Supabase database (`ymrblyiwohvxptiqjfsi`).

The deployment executed cleanly inside an atomic transaction guarded by advisory transaction lock `746291048201582`. The migration ledger advanced from 23 to 24 migrations. All post-deployment schema objects, check constraints, indexes, Row Level Security policies, and privilege boundaries were verified independently using read-only queries against the live PostgreSQL catalog.

Zero modifications were made to legacy tables, baseline records (`water_logs`, `legacy_user_id_map`, `profiles`, `users`), or sequence counters. **Phase 10B was not deployed and production remains untouched.**

> [!NOTE]
> **Production Boundary**:
> This report establishes successful staging verification of Phase 10A. It does **not** assert production readiness for STRIVA V2. Production deployment requires separate authorization following completion of all Phase 10 validation gates.

---

## 2. PREFLIGHT VERIFICATION RECORD

All mandatory preflight checks were executed and confirmed before opening the deployment transaction:

| Preflight Check | Target Requirement | Observed Staging Fact | Status |
| :--- | :--- | :--- | :---: |
| **Project Reference** | `ymrblyiwohvxptiqjfsi` | `db.ymrblyiwohvxptiqjfsi.supabase.co` | **PASS** |
| **Pre-Migration Count** | Exactly 23 migrations | Exactly 23 migrations | **PASS** |
| **Latest Applied Migration** | `phase_9b_legacy_identity_bridge.sql` | `phase_9b_legacy_identity_bridge.sql` | **PASS** |
| **Phase 10 Pre-Existing Check** | 0 Phase 10 objects | 0 Phase 10 objects found | **PASS** |
| **Pre-Deployment Checkpoint** | `striva_staging_checkpoint_pre_phase10a_2026-10-12T06-11-17-818Z.sql` | File verified in `<AppDataDir>/scratch/backups/` | **PASS** |
| **Checkpoint SHA-256 Digest** | `82ee3a15e4eb781abaf9d45827ca40a2d0d99fcf0ce2f22bf587813c0f551096` | SHA-256 independently matched | **PASS** |
| **Baseline Hydration Rows** | Exactly 13 `water_logs` | Exactly 13 rows (1 for user 147, 12 for user 153) | **PASS** |
| **Identity Mappings** | Exactly 2 dual-factor mappings | IDs 148 and 151 mapped | **PASS** |
| **Runner Lock Key** | `746291048201582` | Transaction advisory lock verified | **PASS** |

---

## 3. DEPLOYMENT EXECUTION RECORD

The registered migration was executed via targeted runner mode:

```bash
node backend/scripts/apply_staging_migrations.js phase_10a_nutrition_core_schema.sql
```

### Execution Log
```
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_10a_nutrition_core_schema.sql
[APPLYING] phase_10a_nutrition_core_schema.sql...
[SUCCESS] phase_10a_nutrition_core_schema.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 97
```

- **Exit Code:** `0`
- **Advisory Lock:** Acquired at start of transaction; released upon `COMMIT`.
- **Transaction Scope:** Additive DDL and `_migrations` tracking committed atomically.

---

## 4. INDEPENDENT POST-DEPLOYMENT VERIFICATION

All verifications below were executed via read-only SQL queries against live staging:

### 4.1 Migration Ledger
- **Total Migrations:** `24` (increased from 23 to 24).
- **Phase 10A Entry:** `phase_10a_nutrition_core_schema.sql` recorded exactly once with timestamp `2026-10-12T08:38:49.000Z`.
- **Phase 10B Entry:** Confirmed **0 entries** (`has_phase_10b = false`).

### 4.2 Table Schema: `public.v2_nutrition_logs`
Verified column layout against `information_schema.columns`:
| Column Name | Data Type | Nullable | Default Expression | Contract Status |
| :--- | :--- | :---: | :--- | :---: |
| `id` | `uuid` | NO | `gen_random_uuid()` | **VERIFIED** |
| `user_id` | `uuid` | NO | *None (Required)* | **VERIFIED** |
| `date` | `date` | NO | `CURRENT_DATE` | **VERIFIED** |
| `meal_type` | `varchar(32)` | NO | `'snack'::character varying` | **VERIFIED** |
| `food_name` | `text` | NO | *None (Required)* | **VERIFIED** |
| `calories` | `int4` | NO | `0` | **VERIFIED** |
| `protein_g` | `numeric(6,2)` | NO | `0.00` | **VERIFIED** |
| `carbs_g` | `numeric(6,2)` | NO | `0.00` | **VERIFIED** |
| `fats_g` | `numeric(6,2)` | NO | `0.00` | **VERIFIED** |
| `notes` | `text` | YES | *NULL* | **VERIFIED** |
| `created_at` | `timestamptz` | NO | `now()` | **VERIFIED** |
| `updated_at` | `timestamptz` | NO | `now()` | **VERIFIED** |

### 4.3 Foreign Keys & Integrity Constraints
Verified against `pg_constraint`:
1. **Primary Key:** `v2_nutrition_logs_pkey` on `(id)`.
2. **Foreign Key:** `v2_nutrition_logs_user_id_fkey` &rarr; `FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`.
3. **Macro Check Constraints:**
   - `v2_nutrition_logs_calories_check`: `CHECK (((calories >= 0) AND (calories <= 20000)))`
   - `v2_nutrition_logs_protein_g_check`: `CHECK (((protein_g >= 0.00) AND (protein_g <= 1000.00)))`
   - `v2_nutrition_logs_carbs_g_check`: `CHECK (((carbs_g >= 0.00) AND (carbs_g <= 1000.00)))`
   - `v2_nutrition_logs_fats_g_check`: `CHECK (((fats_g >= 0.00) AND (fats_g <= 1000.00)))`
   - `v2_nutrition_logs_food_name_check`: `CHECK ((char_length(TRIM(BOTH FROM food_name)) >= 1))`
   - `v2_nutrition_logs_meal_type_check`: `CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'))`
4. **Multiple Meals per Date (No Constraint):**
   - Confirmed **0 unique constraints** on `(user_id, date)`. Athletes can log breakfast, lunch, snacks, and dinner on the same day without collisions.

### 4.4 Indexes
Verified against `pg_indexes`:
1. `v2_nutrition_logs_pkey`: UNIQUE BTREE on `(id)`
2. `idx_v2_nutrition_logs_user_date`: BTREE on `(user_id, date)`
3. `idx_v2_nutrition_logs_user_created`: BTREE on `(user_id, created_at DESC)`

### 4.5 Aggregation View: `public.v2_daily_nutrition_summary`
Verified against `information_schema.views` and `pg_class`:
- **View Exists:** `true`
- **Columns:** `user_id`, `date`, `total_calories`, `total_protein_g`, `total_carbs_g`, `total_fats_g`, `meal_count`
- **Security Invoker:** Option `["security_invoker=true"]` confirmed. PostgreSQL evaluates underlying table RLS policies based on the executing user's context.

### 4.6 Row Level Security & Access Control
Verified against `pg_class` and `pg_policies`:
- **RLS Enabled:** `relrowsecurity = true` on `public.v2_nutrition_logs`.
- **Policies on `v2_nutrition_logs`:**
  1. `v2_nutrition_member_select`: `FOR SELECT TO authenticated USING (auth.uid() = user_id)`
  2. `v2_nutrition_member_insert`: `FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`
  3. `v2_nutrition_member_update`: `FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
  4. `v2_nutrition_member_delete`: `FOR DELETE TO authenticated USING (auth.uid() = user_id)`
- **Access Isolation Boundary:**
  - Authenticated members cannot read, update, or delete other athletes' meal records.
  - Organization staff/trainers have **zero broad read access** to private athlete nutrition logs.
  - Anonymous (`anon`) and `PUBLIC` roles have **0 privileges** on `v2_nutrition_logs` and `v2_daily_nutrition_summary`.

---

## 5. BASELINE PRESERVATION AUDIT

All baseline tables and sequence counters were confirmed 100% intact post-deployment:

| Baseline Object | Preflight Count | Post-Deployment Count | Drift Detected |
| :--- | :---: | :---: | :---: |
| `public.organizations` | 1 | 1 | **None (0%)** |
| `public.users` | 7 | 7 | **None (0%)** |
| `public.profiles` | 5 | 5 | **None (0%)** |
| `public.organization_members` | 0 | 0 | **None (0%)** |
| `public.exercise_categories` | 5 | 5 | **None (0%)** |
| `public.exercises` | 4 | 4 | **None (0%)** |
| `public.legacy_user_id_map` | 2 | 2 | **None (0%)** |
| `public.water_logs` | 13 | 13 | **None (0%)** |
| `public._migrations` | 23 | 24 | **+1 (Phase 10A only)** |
| `public.water_logs_id_seq` | 18 (called: true) | 18 (called: true) | **None (0%)** |
| `public.users_id_seq` | 153 (called: true) | 153 (called: true) | **None (0%)** |
| Legacy Domain Tables | 0 rows | 0 rows | **None (0%)** |

### Phase 9B Verification Post-Deploy
- Legacy mappings for users 148 and 151 remain active in `legacy_user_id_map`.
- All 13 historical hydration logs in `water_logs` retain dual-key `amount_ml` values and mapped `profile_id` references.
- Transitional compatibility trigger `trg_sync_water_logs_compatibility` remains intact.

---

## 6. PHASE 10B & PRODUCTION ISOLATION AUDIT

- **Phase 10B Objects:** Verified `v2_workout_plans`, `v2_workout_sessions`, `v2_workout_logs`, and `exercise_sets` do **NOT** exist in the staging database (count: 0).
- **Phase 10B Ledger:** `phase_10b_workout_core_schema.sql` was **NOT** executed and is not present in `_migrations`.
- **Production Environment:** Zero connections, commands, or modifications were directed at production.

---

## 7. WARNINGS, FAILED CHECKS, OR DISCREPANCIES

- **Failed Checks:** **None.**
- **Warnings:** None. All DDL and DML assertions completed with zero errors or rollbacks.
- **Data Drift:** Zero drift detected across all monitored baseline tables.

---

## 8. HALT CONDITION MET

Deployment of **Phase 10A** is complete, verified, and reported.

- **Phase 10B has NOT been deployed.**
- **DB-5 and unrelated work have NOT been initiated.**
- Execution has halted awaiting separate operator review and authorization for subsequent phases.
