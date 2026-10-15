# STRIVA V2 — Phase 11 / DB-5E: Free-Plan Backup & Restore Rehearsal Report

**Document Version:** 1.0.0  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Host / Address:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Supabase Plan:** Free  
**Current Migration Baseline:** Exactly 25 migrations (through Phase 10B)  
**Disposable Test Environment:** Isolated local PostgreSQL 18.3 on `127.0.0.1:5433`  
**Production & Staging Remote Mutations:** 0 (Strictly Untouched)  
**Decision Gate Verdict:** **CONDITIONAL PASS** (Local backup & restore verified; DB-5 rehearsal caught latent legacy type mismatch defect)

---

## 1. Executive Summary & Gate Verdict

Because Supabase Free tier projects do not provide customer-facing Point-in-Time Recovery (PITR) consoles or automated point-in-time rollbacks (despite background PostgreSQL WAL archiving by the host), STRIVA V2 conducted an empirical **Free-Plan Disaster Recovery Verification and DB-5 Rehearsal** in accordance with operational safety rules.

### Verdict Breakdown

| Verification Dimension | Status | Key Empirical Evidence |
| :--- | :---: | :--- |
| **Consistent Logical Backup** | **PASS** | Captured public schema DDL (285,472 bytes), auth identities (5 users), and table data (48,208 bytes) without logging credentials. |
| **Isolated Local Restoration** | **PASS** | Restored into clean disposable PostgreSQL 18.3 database (`striva_restore_test`). Migration baseline (25/25), public base tables (99/99), functions (11), triggers (17), and RLS policies (85) match staging 100%. |
| **Row Count Parity** | **PASS** | Exact row parity across all critical tables: `_migrations` (25), `organizations` (1), `profiles` (5), `subscriptions` (4), `exercises` (4), `v2_workout_sessions` (0), `v2_nutrition_logs` (0). |
| **DB-5 DDL Rehearsal** | **PASS** | `phase_11_prelaunch_hardening.sql` committed cleanly. `profiles.organization_id` default dropped from fallback UUID to `NULL`. 0 profiles retain fallback UUID. Function search paths set to `pg_catalog, pg_temp`. |
| **Runtime Rehearsal of `reset_demo_account`** | **DEFECT CAUGHT (Finding DB5E-01)** | Uncovered latent schema defect: all 12 legacy tables (`progress`, `daily_plans`, etc.) have `user_id INTEGER`, but unpatched function queries `WHERE user_id = target_user_id` (UUID), triggering `ERROR 42883: operator does not exist: integer = uuid`. Remediated in disposable sandbox using `legacy_user_id_map`. |
| **Pre-Migration Rollback Verification** | **PASS** | Verified repeatable restoration of pre-migration baseline in a clean database (`striva_restore_test_recheck`), restoring 25 migrations and the pre-migration default column value. |
| **Staging Deployment Gate** | **CONDITIONAL PASS** | Recovery runbook is validated. Remote migration execution remains **HALTED** pending explicit authorization to patch the `integer = uuid` defect in `phase_11_prelaunch_hardening.sql`. |

---

## 2. Environment & Tooling Inspection

1. **Supabase CLI Version:** `2.120.0` (invoked via `npx supabase`).
2. **Project Reference:** `ymrblyiwohvxptiqjfsi` (verified via sanitized `DATABASE_URL` targeting Supabase staging).
3. **PostgreSQL Client / Server Versions:**
   - Remote Staging Engine: PostgreSQL 17.6 (aarch64 Linux).
   - Local Disposable Engine: PostgreSQL 18.3 (x86_64 Windows) on port 5433.
   - Client Utilities: `pg_dump.exe` 18.3, `psql.exe` 18.3.
4. **Supabase Free Plan Operational Reality:**
   While `pg_stat_archiver` telemetry proves continuous WAL archiving on the server, the Supabase Free plan does not offer self-service point-in-time rewind through the platform control plane. Therefore, **consistent, off-cluster logical SQL exports** represent the primary customer-controlled disaster recovery capability.

---

## 3. Local Backup Creation & Artifacts

All backups were exported via authorized, read-only connections and stored outside the web root in the isolated scratch artifact store (`scratch/backups/`). In addition, `.gitignore` was updated to explicitly exclude `backups/`, `*.dump`, and `*.sql.bak`.

### Generated Backup Artifacts

| Artifact Name | Scope & Content | Size | Integrity Check |
| :--- | :--- | :---: | :---: |
| `striva_staging_baseline_25_schema.sql` | Public schema DDL, 99 base tables, views, sequences, 11 functions, 17 triggers, 85 RLS policies, table grants. Sanitized of psql meta-commands (`\restrict`). | 285,472 bytes | Validated syntax on PG 18 |
| `striva_staging_baseline_25_auth.sql` | `auth.users` identities and metadata for all 5 staging accounts (`demo@sweatfix.com`, `qa_verifier@sweatfix.com`, and 3 admin/member accounts). | 1,840 bytes | Validated FK target on PG 18 |
| `striva_staging_baseline_25_data.sql` | Table data for all public tables using `--column-inserts`, wrapped in `session_replication_role = replica` to guarantee constraint-safe restoration. | 48,208 bytes | Validated row counts on PG 18 |

### Included vs Excluded Objects

- **Included:**
  - `public._migrations` (full baseline history of all 25 migrations).
  - All public domain tables (`organizations`, `profiles`, `subscriptions`, `exercises`, etc.).
  - All public functions (`handle_new_user`, `is_org_member`, `enforce_workout_session_state_transition`, etc.).
  - All public triggers and RLS policies.
  - `auth.users` identity records required to satisfy relational foreign keys.
- **Excluded by Platform:**
  - Supabase internal schemas (`_analytics`, `_realtime`, `_supavisor`, `vault`, `cron`, `extensions`).
  - Physical cluster configuration and WAL files.

---

## 4. Empirical Verification & Local Restoration

The generated backup files were restored into a clean test database `striva_restore_test` hosted on the isolated PostgreSQL 18.3 instance (127.0.0.1:5433).

### 4.1. Prerequisites Established Prior to Restore
To enable 100% faithful replication of Supabase managed infrastructure in a standalone PostgreSQL instance, the following prerequisites were applied:
1. **Cluster Roles:** `anon`, `authenticated`, `service_role`, `supabase_auth_admin`, `supabase_admin`, `authenticator`.
2. **Auth Helper Functions:**
   - `auth.uid()` returning UUID from JWT sub claim.
   - `auth.jwt()` returning JSONB from JWT claims.
   - `auth.role()` returning text from JWT role claim.

### 4.2. Schema & Data Parity Results

```
Restored migration baseline count: 25 (Expected: 25) -> MATCH
Restored public base tables count: 99 (Expected: 99) -> MATCH
Restored public functions count: 11 (Expected: 11) -> MATCH
Restored public triggers count: 17 (Expected: 17) -> MATCH
Restored public RLS policies count: 85 (Expected: 85) -> MATCH

Critical Table Row Parity:
  - _migrations: Restored=25, Staging=25 -> MATCH
  - organizations: Restored=1, Staging=1 -> MATCH
  - profiles: Restored=5, Staging=5 -> MATCH
  - organization_members: Restored=0, Staging=0 -> MATCH
  - subscriptions: Restored=4, Staging=4 -> MATCH
  - exercises: Restored=4, Staging=4 -> MATCH
  - v2_workout_sessions: Restored=0, Staging=0 -> MATCH
  - v2_nutrition_logs: Restored=0, Staging=0 -> MATCH
```

---

## 5. DB-5 Prelaunch Hardening Rehearsal

With the restored database verified at the clean 25-migration baseline, the draft migration `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` was applied to `striva_restore_test`.

### 5.1. DDL Execution Results
1. **Advisory Lock:** Acquired transaction-level lock `746291048201582`.
2. **Tenant Default Removal:**
   - Pre-migration default: `'00000000-0000-0000-0000-000000000001'::uuid`.
   - Post-migration default: `NULL` (Verified).
   - Profiles retaining fallback UUID: **0** (All existing profiles converted to `NULL`).
3. **Routine Search Paths:**
   - `handle_new_user`: `search_path=pg_catalog, pg_temp` (Verified).
   - `is_org_member`: `search_path=pg_catalog, pg_temp` (Verified).
   - `enforce_workout_session_state_transition`: `search_path=pg_catalog, pg_temp` (Verified).
   - `reset_demo_account`: `search_path=pg_catalog, pg_temp` (Verified).

---

## 6. Critical Finding DB5E-01: Legacy Table Type Mismatch

During runtime invocation rehearsal of `reset_demo_account('a1bf8b11-e2c7-4f7f-9d36-5af53418e20b'::uuid)`, PostgreSQL threw a fatal error:

```
ERROR: operator does not exist: integer = uuid
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
QUERY: DELETE FROM public.progress WHERE user_id = target_user_id
CONTEXT: PL/pgSQL function public.reset_demo_account(uuid) line 37 at SQL statement
```

### Root Cause Analysis
1. In the actual database schema, all 12 legacy tables (`progress`, `daily_plans`, `workout_plans`, `workout_sessions`, `chatbot_generated_plans`, `workout_logs`, `progress_logs`, `chatbot_generated_workouts`, `chatbot_generated_diets`, `user_fitness_plans`, `user_meal_tracking`, `user_progress`) declare `user_id INTEGER`, referencing legacy table `public.users(id)`.
2. In `phase_11_prelaunch_hardening.sql`, lines 85–96 execute:
   ```sql
   DELETE FROM public.progress WHERE user_id = target_user_id;
   ```
   Because `target_user_id` is a `UUID`, PostgreSQL cannot compare `integer` to `uuid`.
3. In earlier synthetic unit tests, mock tables were mistakenly declared with `user_id UUID`, masking this defect. Only full restoration of the actual staging schema uncovered it.

### Sandbox Remediation Tested
To verify the required fix without mutating the draft migration file (complying with hard stops), the routine was tested in the disposable sandbox using STRIVA V2's Phase 9B legacy bridge table `public.legacy_user_id_map`:

```sql
SELECT legacy_integer_id INTO v_legacy_user_id 
FROM public.legacy_user_id_map 
WHERE profile_id = target_user_id;

IF v_legacy_user_id IS NOT NULL THEN
    DELETE FROM public.progress WHERE user_id = v_legacy_user_id;
    DELETE FROM public.daily_plans WHERE user_id = v_legacy_user_id;
    -- ... remaining legacy tables ...
END IF;
```

**Sandbox Verification:**
- Demo activity in modern V2 tables (`v2_workout_sessions`, `v2_nutrition_logs`, `water_logs`, `exercise_sets`) was purged to 0.
- Legacy tables were deleted without type errors.
- Strict authorization correctly rejected `demosthenes@example.com` (`Demo reset is strictly restricted to demo@sweatfix.com`).
- Core demo identity (`profiles`) and subscription were preserved.

---

## 7. Repeatable Recovery Verification

A clean database `striva_restore_test_recheck` was created and restored from `striva_staging_baseline_25_schema.sql` and `striva_staging_baseline_25_data.sql`.

- **Migration Count:** 25/25 restored.
- **Profiles Default:** `'00000000-0000-0000-0000-000000000001'::uuid` restored.
- **Confirmation:** In the event that a deployment to staging requires rollback, restoring from this logical backup cleanly reconstitutes the pre-migration baseline.

---

## 8. Summary of Test & Build Verification

- **Vitest Targeted Security Suite (`db5b_demo_reset_authorization`):** 10/10 PASS (7ms)
- **Vitest Unit Suites (`backend/tests/unit`):** 84/84 PASS (1.78s)
- **Workspace Production Build (`npm run build`):** Vite frontend + TypeScript backend PASS (Exit code 0)

---

## 9. Limitations & Free-Plan Realities

1. **Logical vs Physical Recovery:**  
   A local logical SQL backup restores database objects and rows, but does not provide point-in-time rewind to an arbitrary second. It is a point-in-time snapshot as of the dump execution.
2. **Auth User Synchronization:**  
   Restoring `auth.users` locally requires service-role/admin export. Passwords in `auth.users` are bcrypt-hashed and remain cryptographically protected.
3. **Storage Binaries:**  
   Currently staging has 0 storage buckets and 0 storage objects; if binary assets are added in the future, S3/storage bucket sync scripts will be required.

---

## 10. Deployment Gate Determination

- **Local Backup and Restore:** **PASS**
- **Pre-Migration Rollback Rehearsal:** **PASS**
- **DB-5 Deployment Gate:** **CONDITIONAL PASS / GATED**  
  *Action Required before Staging Deployment:* Obtain operator approval to patch `phase_11_prelaunch_hardening.sql` with the `legacy_user_id_map` integer resolution fix to prevent runtime error `42883`.
