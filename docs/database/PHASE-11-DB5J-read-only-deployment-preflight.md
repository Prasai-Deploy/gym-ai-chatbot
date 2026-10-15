# STRIVA V2 — Phase 11 / DB-5J: Read-Only Deployment Preflight Report (Re-run Post DB-5K)

**Document Version:** 2.0.0  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Staging Baseline:** Exactly 25 migrations (through Phase 10B)  
**Target Migration:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`  
**Calculated SHA256 Hash:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`  
**Target Reviewed DB-5I Hash:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701` (Match: 100%)  
**Production Database:** Strictly Untouched  
**Remote Execution:** Strictly 0 (Preflight read-only inspection only)  

---

## 1. Preflight Verification Summary Matrix

| # | Inspection Check | Status | Key Evidence / Rationale |
| :-: | :--- | :---: | :--- |
| **1** | **Workspace & Registration** | **PASS** | Repository root `CHATBOT_PROJECT`, branch `main`. Working tree modifications preserved. `phase_11_prelaunch_hardening.sql` registered as migration 26 in `apply_staging_migrations.js`. Exact filename targeting supported (`process.argv[2]`). Full build (`npm run build`) clean. |
| **2** | **Staging Target Guard** | **PASS** | Runner `apply_staging_migrations.js` includes `validateStagingDatabaseUrl` verifying exact host `db.ymrblyiwohvxptiqjfsi.supabase.co` and ref `ymrblyiwohvxptiqjfsi`. Executes before `new pg.Pool()` or any connection attempt. 17/17 DB-5K security tests pass. |
| **3** | **Migration Integrity** | **PASS** | Calculated SHA-256 hash is `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`, matching the DB-5I reviewed hash exactly. Advisory lock `746291048201582` and single transaction intact. |
| **4** | **Backup Prerequisites** | **PASS** | Logical backup files exist in `scratch/backups/`: `schema` (285,472 B, 8,709 lines), `auth` (3,613 B, 28 lines), `data` (48,208 B, 992 lines). Disposable restoration rehearsed in local PG 18.3. Correctly recognized as logical snapshots, not managed PITR. |
| **5** | **Live Staging Baseline** | **PASS** | Live connection to `db.ymrblyiwohvxptiqjfsi.supabase.co` successful. `public._migrations` contains exactly 25 records. Phase 11 is not recorded. Fallback default `'00000000-0000-0000-0000-000000000001'::uuid` confirmed across 5 profiles. |
| **—** | **Final Preflight Gate Verdict** | **PASS** | All 5 inspection checks passed. Remote mutations: 0. Production: untouched. Guard verified. |

---

## 2. Check 1: Workspace Verification

- **Repository Root:** `c:\Users\priyanashu\Downloads\CHATBOT_PROJECT`
- **Current Git Branch:** `main`
- **Working Tree Status:** 45 modified tracked files, 54 untracked artifacts. All existing working tree changes preserved untouched.
- **Full Workspace Build:** `npm run build` executed and passed with exit code 0.
- **Runner Registration:** `backend/scripts/apply_staging_migrations.js` registers `phase_11_prelaunch_hardening.sql` at line 85 as the final item of the `migrations` array.
- **Exact-Filename Filtering:**
  ```javascript
  const targetFile = process.argv[2];
  const migrationsToProcess = targetFile
    ? migrations.filter(m => m === targetFile)
    : migrations;

  if (targetFile && migrationsToProcess.length === 0) {
    throw new Error(`Target migration "${targetFile}" is not registered in runner migration list.`);
  }
  ```
  Targeted invocation (`node backend/scripts/apply_staging_migrations.js phase_11_prelaunch_hardening.sql`) isolates execution strictly to DB-5.

---

## 3. Check 2: Staging Target Guard (PASS)

### 3.1. Implementation in `backend/scripts/apply_staging_migrations.js`
Lines 9–67 define `validateStagingDatabaseUrl`:
- Protocol check: must be `postgresql:` or `postgres:`.
- Exact hostname check: `hostname === 'db.ymrblyiwohvxptiqjfsi.supabase.co'`.
- Structural segmentation check: `['db', 'ymrblyiwohvxptiqjfsi', 'supabase', 'co']`.
- Credential safety: never logs or leaks credentials.

### 3.2. Pre-Connection Call Sequence in `run()`
Lines 98–107:
```javascript
let targetInfo;
try {
  targetInfo = validateStagingDatabaseUrl(process.env.DATABASE_URL);
} catch (guardErr) {
  console.error('FATAL TARGET GUARD ERROR:', guardErr.message);
  process.exit(1);
}
console.log(`[GUARD] Target verified: Project "${targetInfo.projectRef}" on host "${targetInfo.host}".`);

const pool = new pg.Pool({ ... });
```
The guard strictly executes before `new pg.Pool(...)` or `pool.connect()`.

### 3.3. Test Suite Execution
- Suite: `backend/tests/security/db5k_staging_target_guard.security.test.ts`
- Result: **17 passed / 17 tests (100% pass)** in 308ms.
- Evasion defenses verified: suffix attacks, prefix attacks, typosquatting (`jfs1`), username injection, missing/empty/malformed URLs, invalid schemes.

---

## 4. Check 3: Migration Integrity

- **File Inspected:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`
- **Calculated SHA-256 Hash:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`
- **Target DB-5I Reviewed Hash:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`
- **Evaluation:** **PASS (EXACT MATCH)**.
- **Lock & Transaction Invariants:**
  - `await client.query('BEGIN')` initiates the transaction.
  - Advisory lock `746291048201582` acquired immediately before reading migration state.
  - `INSERT INTO _migrations (name, run_at)` executed inside the same transaction block.
  - Atomic `COMMIT` and catch-block `ROLLBACK` verified intact.

---

## 5. Check 4: Backup Prerequisites & Rehearsal Evidence

### 5.1. Artifact Existence & Readability
The baseline 25 logical backup artifacts exist and are verified readable:
- `scratch/backups/striva_staging_baseline_25_schema.sql` (285,472 bytes, 8,709 lines)
- `scratch/backups/striva_staging_baseline_25_auth.sql` (3,613 bytes, 28 lines)
- `scratch/backups/striva_staging_baseline_25_data.sql` (48,208 bytes, 992 lines)
- Git Exclusion: Ignored via `.gitignore` (`backups/`).

### 5.2. Rehearsal Evidence
- Restoration was rehearsed against disposable PostgreSQL 18.3 instances (`striva_db5g_review`, `striva_db5i_runner_test`).
- Documented in `docs/database/PHASE-11-DB5E-backup-and-restore-report.md`.
- Rehearsals proved that schema, auth identities, and application data restore the exact 25-migration baseline without errors.
- **Scope Limitation Explicitly Noted:** These logical SQL exports restore `public` tables and `auth.users` records. They do not constitute platform PITR, physical cluster snapshots, storage bucket exports, or vault secret backups.

---

## 6. Check 5: Live Staging Baseline (Read-Only Introspection)

Queries executed live against `db.ymrblyiwohvxptiqjfsi.supabase.co` on October 14, 2026 at 12:30:56 IST:

```
[TARGET METADATA]
Database Name: postgres
Connecting Role: postgres
Engine Version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu
Host Domain: db.ymrblyiwohvxptiqjfsi.supabase.co
Supabase Project Ref: ymrblyiwohvxptiqjfsi

[MIGRATION HISTORY: public._migrations]
Total Applied Count: Exactly 25
Latest Applied Migration: phase_10b_workout_core_schema.sql (Mon Oct 12 2026 14:23:31 IST)
phase_11_prelaunch_hardening.sql Recorded: NO (NOT APPLIED)

[SUPABASE REGISTRY DISCREPANCY]
Native Tables: auth.schema_migrations (82 rows), realtime.schema_migrations (89 rows)
Native public/supabase_migrations: Does not exist.
Eligibility Registry: STRIVA V2 exclusively uses custom public._migrations.

[COLUMN DEFAULT STATUS]
profiles.organization_id Default: '00000000-0000-0000-0000-000000000001'::uuid
Profiles Holding Fallback UUID: 5 profiles
```

---

## 7. Final Gate Determination

All required preflight checks have been empirically executed and verified **PASS**. The target guard is active and tested, the migration hash is bit-for-bit unchanged, logical backups and rehearsal records are confirmed, and the live staging baseline remains strictly unmodified at exactly 25 migrations.

# **READY FOR EXPLICIT STAGING DEPLOYMENT**
