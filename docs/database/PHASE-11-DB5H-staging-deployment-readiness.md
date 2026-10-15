# STRIVA V2 — Phase 11 / DB-5H: Staging Deployment Readiness Report

**Document Version:** 1.0.0  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Staging Baseline:** Exactly 25 migrations (through Phase 10B)  
**Expected Post-Deployment Baseline:** Exactly 26 migrations  
**Target Migration Candidate:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` (SHA256: `777C7354FC7D2169831A7504A833080B2CEFD80007666A67D596F3D53AA0013C`)  
**Production Database:** Strictly Untouched  
**Deployment Execution Status:** **HALTED — NOT AUTHORIZED (PENDING OPERATOR GATE)**  
**Readiness Verdict:** **READY FOR OPERATOR AUTHORIZATION**

---

## 1. Executive Summary & Verdict

Prior to considering any remote deployment of Phase 11 / DB-5 (`phase_11_prelaunch_hardening.sql`), an exhaustive, read-only operational audit and runner verification was conducted.

### Verification Summary

1. **Migration Artifact Integrity:** Verified that `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` matches the independently verified DB-5G review artifact byte-for-byte. SHA256 checksum is `777C7354FC7D2169831A7504A833080B2CEFD80007666A67D596F3D53AA0013C`. Zero modifications have been made since the DB-5G independent safety review.
2. **Staging Target & Baseline Verification:** Directly introspected the live Supabase staging database `ymrblyiwohvxptiqjfsi` via read-only SQL queries on October 13, 2026. Staging baseline was confirmed to be **exactly 25 migrations** ending at `phase_10b_workout_core_schema.sql`. `phase_11_prelaunch_hardening.sql` is currently **NOT APPLIED**.
3. **Runner Integration & Transaction Analysis:** Inspected `backend/scripts/apply_staging_migrations.js`. Confirmed that targeted execution (`node backend/scripts/apply_staging_migrations.js phase_11_prelaunch_hardening.sql`) strictly isolates execution to the designated file. Analyzed transaction boundaries and advisory lock `746291048201582`. Identified the prerequisite registration of DB-5 in the runner array and documented the proposed diffs.
4. **Disaster Recovery Readiness:** Confirmed that baseline 25 logical backup files (`schema`, `auth`, `data`) exist, are protected by `.gitignore`, and have been rehearsed on a disposable database. Verified the disaster recovery runbook in [PHASE-11-DB5E-recovery-runbook.md](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/PHASE-11-DB5E-recovery-runbook.md).
5. **Operational Gate Verdict:** **READY FOR OPERATOR AUTHORIZATION**. All technical prerequisites, safety checks, and rollback plans are in place. Remote execution remains halted awaiting explicit human operator consent.

---

## 2. Live Staging Target & Baseline Evidence (Read-Only Introspection)

The following parameters were queried directly from the live staging database on October 13, 2026 at 23:14:59 IST:

```
=== STRIVA V2 READ-ONLY STAGING VERIFICATION ===
Target Host: db.ymrblyiwohvxptiqjfsi.supabase.co
Database Name: postgres
Database User: postgres
Database Engine: PostgreSQL 17.6 on aarch64-unknown-linux-gnu

[MIGRATION BASELINE STATUS]
Total Migrations in public._migrations: 25 (Expected: 25)

Latest 5 Recorded Migrations in Staging:
  - phase_10b_workout_core_schema.sql (applied: Mon Oct 12 2026 14:23:31 GMT+0530)
  - phase_10a_nutrition_core_schema.sql (applied: Mon Oct 12 2026 14:08:48 GMT+0530)
  - phase_9b_legacy_identity_bridge.sql (applied: Sun Oct 11 2026 22:37:36 GMT+0530)
  - phase_9a_rls_recursion_fix.sql (applied: Sun Oct 11 2026 20:31:50 GMT+0530)
  - 008_multi_tenant_saas_foundation.sql (applied: Sat Oct 10 2026 12:15:29 GMT+0530)

[DB-5 MIGRATION STATUS]
phase_11_prelaunch_hardening.sql applied status: NOT APPLIED (PENDING)
Current staging profiles.organization_id default: '00000000-0000-0000-0000-000000000001'::uuid

✓ STAGING READ-ONLY VERIFICATION SUCCEEDED: Baseline is exactly 25 migrations through Phase 10B.
```

### Safety Confirmations:
- **Project Reference:** `ymrblyiwohvxptiqjfsi` (Verified staging project reference; production cannot be selected).
- **Environment Isolation:** `backend/.env` points strictly to `db.ymrblyiwohvxptiqjfsi.supabase.co`. Production database credentials are not present in the local workspace.
- **Unapplied Status:** Staging `profiles.organization_id` holds `'00000000-0000-0000-0000-000000000001'::uuid`, confirming the pre-launch hardening has not yet been deployed.

---

## 3. Migration Runner Review (`apply_staging_migrations.js`)

### 3.1. Registration & Targeted Selection
In `backend/scripts/apply_staging_migrations.js`:
- Migrations are defined in a canonical array `const migrations = [ ... ]`.
- The runner implements a targeted argument check:
  ```javascript
  const targetFile = process.argv[2];
  const migrationsToProcess = targetFile
    ? migrations.filter(m => m === targetFile)
    : migrations;

  if (targetFile && migrationsToProcess.length === 0) {
    throw new Error(`Target migration "${targetFile}" is not registered in runner migration list.`);
  }
  ```
- **Isolation Guarantee:** When executed with `process.argv[2] = 'phase_11_prelaunch_hardening.sql'`, `migrationsToProcess` contains strictly that single file. Unrelated unapplied migrations cannot accidentally run.

### 3.2. Advisory Lock & Transaction Handling
- **Advisory Lock Key:** Bigint `746291048201582` (`SELECT pg_advisory_xact_lock($1)`).
- **Scope:** Transaction-level advisory lock acquired immediately following `BEGIN`. Serializes migration execution and automatically releases upon `COMMIT` or `ROLLBACK`.
- **Error Handling:** On unhandled exception, the runner executes `await client.query('ROLLBACK')`, safely releasing all locks and rolling back uncommitted changes.
- **Connection Cleanup:** In `finally`, `client.release()` and `pool.end()` guarantee pool shutdown. Exits with code 1 on error.

### 3.3. Transaction Boundary Compatibility Analysis
An empirical simulation was executed in local PostgreSQL 18.3 (`test_runner_compatibility.js`) to evaluate the interaction between the runner's transaction wrapper and `phase_11_prelaunch_hardening.sql`:

1. **Current Draft Behavior:**
   - The runner executes `BEGIN;` and acquires `pg_advisory_xact_lock(746291048201582)`.
   - The migration file currently contains an inner `BEGIN;` (line 21) and `COMMIT;` (line 236).
   - In PostgreSQL, entering `BEGIN;` inside an open transaction emits a non-fatal notice: `NOTICE: there is already a transaction in progress`.
   - When the migration file reaches `COMMIT;`, PostgreSQL commits the transaction.
   - The runner's subsequent `INSERT INTO _migrations` runs in autocommit mode, and the runner's final `COMMIT;` emits `NOTICE: there is no transaction in progress`.
2. **Canonical Alignment Alternative:**
   - In Phase 9A, 9B, 10A, and 10B, canonical migrations omit top-level `BEGIN;` and `COMMIT;` statements, allowing the runner to enclose both the migration SQL and the `_migrations` insertion within a single atomic ACID block.
   - When top-level `BEGIN;` / `COMMIT;` are omitted, the simulation confirmed **zero notices** and 100% atomic atomicity across both DDL and `_migrations` recording.

---

## 4. Proposed Code Changes & Diff

To prepare `apply_staging_migrations.js` and `phase_11_prelaunch_hardening.sql` for deployment, two distinct changes are documented below. In strict adherence to DB-5H constraints, these changes are presented for review and will be applied only upon operator instruction.

### Diff 1: Register DB-5 in `backend/scripts/apply_staging_migrations.js` (Required)
```diff
--- a/backend/scripts/apply_staging_migrations.js
+++ b/backend/scripts/apply_staging_migrations.js
@@ -26,7 +26,8 @@ const migrations = [
   'phase_9a_rls_recursion_fix.sql',
   'phase_9b_legacy_identity_bridge.sql',
   'phase_10a_nutrition_core_schema.sql',
-  'phase_10b_workout_core_schema.sql'
+  'phase_10b_workout_core_schema.sql',
+  'phase_11_prelaunch_hardening.sql'
 ];
```

### Diff 2: Align `phase_11_prelaunch_hardening.sql` Transaction Boundaries (Recommended)
Aligns with Phase 9A/9B/10A/10B conventions so the runner's outer `BEGIN ... COMMIT` atomically envelops both DDL and `_migrations` recording:
```diff
--- a/backend/supabase/migrations/phase_11_prelaunch_hardening.sql
+++ b/backend/supabase/migrations/phase_11_prelaunch_hardening.sql
@@ -20,12 +20,6 @@
 -- ====================================================================
 
-BEGIN;
-
--- --------------------------------------------------------------------
--- 0. Concurrency Safeguard: Transaction-Level Advisory Lock
--- --------------------------------------------------------------------
-SELECT pg_advisory_xact_lock(746291048201582);
-
 -- --------------------------------------------------------------------
 -- 1. Tenant Isolation: Drop Hardcoded Fallback Default on profiles.organization_id
 -- --------------------------------------------------------------------
@@ -235,4 +229,3 @@ COMMENT ON FUNCTION public.enforce_workout_session_state_transition() IS 
 'STRIVA V2 workout session state transition trigger hardened with search_path = pg_catalog, pg_temp.';
 
-COMMIT;
```

---

## 5. Recovery Readiness Verification

### 5.1. Backup Artifacts Status
The pre-migration baseline 25 logical backup files generated during DB-5E are verified to exist:

| Artifact Path | Size (Bytes) | Description | Git Status |
| :--- | :---: | :--- | :---: |
| `<scratchDir>/backups/striva_staging_baseline_25_schema.sql` | 285,472 | Complete public schema DDL, RLS policies, functions, triggers | **Ignored** (`backups/`) |
| `<scratchDir>/backups/striva_staging_baseline_25_auth.sql` | 3,613 | Supabase `auth.users` identities for FK resolution | **Ignored** (`backups/`) |
| `<scratchDir>/backups/striva_staging_baseline_25_data.sql` | 48,208 | Complete application DML with replica-safe inserts | **Ignored** (`backups/`) |

### 5.2. Restoration Rehearsal
- The restoration of these three files was tested on an isolated local PostgreSQL 18.3 database (`striva_db5g_review`).
- All 25 baseline migrations were restored and verified without error.
- Verified that applying `phase_11_prelaunch_hardening.sql` to the restored baseline executed cleanly.

### 5.3. Scope & Limitations of Logical Backups
- **Not Managed PITR:** Local SQL dumps represent a point-in-time logical snapshot. They do **not** provide continuous WAL streaming or self-service slider recovery in the Supabase UI.
- **Catalog Scope:** Logical backups cover `public` schema tables and exported `auth.users` identities. They do **not** restore Supabase Storage S3 buckets, project edge functions, Supabase vault secrets, or platform project configurations.
- **Recovery Authority:** The primary disaster recovery mechanism for prelaunch staging remains the platform-level WAL archive (1,695 archived segments verified in DB-5D), supplemented by the local logical backup.

---

## 6. Pre-Flight Deployment Checklist

This checklist defines the protocol for the operator when authorization is granted:

### Step 1: Pre-Deployment Sanity Checks
- [ ] Verify staging database is online: `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`.
- [ ] Confirm baseline `SELECT count(*) FROM public._migrations;` returns exactly `25`.
- [ ] Confirm `SELECT name FROM public._migrations WHERE name = 'phase_11_prelaunch_hardening.sql';` returns 0 rows.
- [ ] Confirm backup files exist in `scratch/backups/`.

### Step 2: Code Preparation
- [ ] Apply Diff 1: Register `'phase_11_prelaunch_hardening.sql'` in `backend/scripts/apply_staging_migrations.js`.
- [ ] (Optional/Recommended) Apply Diff 2: Remove inner `BEGIN`/`COMMIT` from `phase_11_prelaunch_hardening.sql`.

### Step 3: Exact Deployment Command
Execute strictly via the targeted runner command:
```bash
node backend/scripts/apply_staging_migrations.js phase_11_prelaunch_hardening.sql
```

### Step 4: Immediate Post-Deployment Verification Queries
Run the following verification queries immediately after deployment:

```sql
-- 1. Verify migration count incremented to 26
SELECT count(*) AS total_migrations FROM public._migrations;
-- Expected: 26

-- 2. Verify phase_11 recorded
SELECT name, run_at FROM public._migrations ORDER BY run_at DESC LIMIT 1;
-- Expected: phase_11_prelaunch_hardening.sql

-- 3. Verify profiles.organization_id default is dropped (NULL)
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id';
-- Expected: column_default IS NULL

-- 4. Verify search paths pinned on all 4 routines
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('reset_demo_account', 'handle_new_user', 'is_org_member', 'enforce_workout_session_state_transition')
  AND pronamespace = 'public'::regnamespace;
-- Expected: proconfig contains 'search_path=pg_catalog, pg_temp' for all 4

-- 5. Verify reset_demo_account privileges restricted to service_role
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' AND routine_name = 'reset_demo_account';
-- Expected: Grantees limited to postgres and service_role; zero grants to PUBLIC, anon, authenticated
```

### Step 5: Decision Matrix & Abort Criteria
- **Immediate Abort Conditions:**
  - If the runner fails with any error or non-zero exit code.
  - If migration count is not 26 post-deployment.
  - If `profiles.organization_id` retains `'00000000-0000-0000-0000-000000000001'::uuid`.
- **Targeted DDL Rollback Plan:**
  If operational issues emerge post-deployment, execute within an atomic transaction:
  ```sql
  BEGIN;
  SELECT pg_advisory_xact_lock(746291048201582);
  ALTER TABLE public.profiles ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  DROP FUNCTION IF EXISTS public.reset_demo_account(UUID);
  DELETE FROM public._migrations WHERE name = 'phase_11_prelaunch_hardening.sql';
  COMMIT;
  ```

---

## 7. Hard Stop & Readiness Determination

- **Target Staging Database:** `ymrblyiwohvxptiqjfsi`
- **Current Baseline:** Exactly 25 migrations
- **Remote Migrations Executed:** Strictly 0
- **Final Verdict:** **READY FOR OPERATOR AUTHORIZATION**
- **Action Required:** Stand down and await explicit operator authorization (`/striva` or verbal confirmation) before executing deployment.
