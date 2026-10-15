# STRIVA V2 — DB-4G: Fresh Pre-Phase 10A Staging Checkpoint Report

**Document Version:** 1.0.0  
**Capture Timestamp (UTC):** `2026-10-12T06:11:17.818Z`  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Target Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432` (Direct IPv6: `2406:da1a:b00:1301:3210:50bf:8c8:6055`)  
**Database Engine:** `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit`  
**Current WAL LSN:** `6/9C000000` (`in_recovery: false`)  
**Target Migration Candidate:** `backend/supabase/migrations/phase_10a_nutrition_core_schema.sql`  
**Executive Status:** **`PASS`**  

---

## 1. EXECUTIVE SUMMARY

Immediately prior to the proposed staging deployment of Phase 10A (`phase_10a_nutrition_core_schema.sql`), a fresh, timestamped logical recovery checkpoint was created and cryptographically verified.

All operations against the remote staging database were strictly **read-only**. Zero DDL, zero DML, zero migrations, and zero test mutations were executed against staging.

The fresh checkpoint artifact has been validated through isolated restore testing on a disposable PostgreSQL 18 instance (`127.0.0.1:5433`), confirming 100% baseline fidelity, safe topological dependency ordering, and complete recovery runbook readiness.

---

## 2. CHECKPOINT ARTIFACT IDENTIFIERS & INTEGRITY

Both artifacts are stored strictly outside the Git repository in restricted local storage:

| Attribute | SQL Checkpoint Artifact | JSON Manifest Artifact |
| :--- | :--- | :--- |
| **Filename** | `striva_staging_checkpoint_pre_phase10a_2026-10-12T06-11-17-818Z.sql` | `striva_staging_checkpoint_manifest_pre_phase10a_2026-10-12T06-11-17-818Z.json` |
| **Filesystem Location** | `<AppDataDir>/scratch/backups/` | `<AppDataDir>/scratch/backups/` |
| **File Size** | `24,525 bytes` | `2,869 bytes` |
| **SHA-256 Digest** | `82ee3a15e4eb781abaf9d45827ca40a2d0d99fcf0ce2f22bf587813c0f551096` | Verified and recorded inside manifest |
| **Integrity Check** | **INDEPENDENT RE-HASH MATCHED** | **PARSED & VALIDATED** |
| **Secret Audit** | **0 credentials, passwords, or tokens present** | **0 credentials, passwords, or tokens present** |

> [!IMPORTANT]
> **Cryptographic Digest Boundary**:
> The matching SHA-256 digest proves file integrity at rest. It is **not** presented as sole proof of restoration viability. Viability was demonstrated by executing a full replay against an isolated PostgreSQL engine (Section 6).

---

## 3. VERIFIED STAGING BASELINE STATE

Read-only queries against Supabase staging project `ymrblyiwohvxptiqjfsi` confirmed the exact baseline state:

### 3.1 Migration Ledger
- **Applied Migration Count:** Exactly `23` migrations.
- **Latest Applied Migration:** `phase_9b_legacy_identity_bridge.sql` (applied at `2026-10-11T17:07:36.445Z`).
- **Phase 10 Status:** `phase_10a_nutrition_core_schema.sql` and `phase_10b_workout_core_schema.sql` are **NOT** applied.
- **Phase 10 Schema Objects:** Audited `information_schema.tables` and confirmed **0 Phase 10 objects exist** (`v2_nutrition_logs`, `v2_daily_nutrition_summary`, `v2_workout_plans`, `v2_workout_sessions`, `v2_workout_logs` all absent).

### 3.2 Baseline Table Row Counts
| Table Name | Observed Count | Expected Count | Status |
| :--- | :---: | :---: | :---: |
| `public.organizations` | **1** | 1 | Verified (Default enterprise organization) |
| `public.users` | **7** | 7 | Verified (Legacy users 147 through 153) |
| `public.profiles` | **5** | 5 | Verified (All modern UUID profiles) |
| `public.organization_members` | **0** | 0 | Verified |
| `public.exercise_categories` | **5** | 5 | Verified |
| `public.exercises` | **4** | 4 | Verified |
| `public.legacy_user_id_map` | **2** | 2 | Verified (Dual-factor mapped pairs) |
| `public.water_logs` | **13** | 13 | Verified (100% of historical hydration rows intact) |
| `public._migrations` | **23** | 23 | Verified (Complete migration ledger) |
| Legacy Domain Tables (`nutrition_logs`, `user_meal_tracking`, `meal_plans`, `workout_plans`, `workout_sessions`, `workout_logs`) | **0** | 0 | Verified |

### 3.3 Sequence Observations (Read-Only)
- `public.water_logs_id_seq`: `last_value = 18`, `is_called = true`.
- `public.users_id_seq`: `last_value = 153`, `is_called = true`.

### 3.4 Phase 9B Identity Map & Hydration Verification
- **Identity Mappings (2 rows):**
  1. Legacy ID `148` &rarr; Profile `b96c0b60-9a8b-496f-9e33-f533982412f6` (`oauth_sub_and_email`)
  2. Legacy ID `151` &rarr; Profile `2dbbad1d-5988-4d6f-8c32-5c57080e56f5` (`oauth_sub_and_email`)
- **Hydration Totals (13 rows):**
  - Legacy User `153`: 12 rows (IDs 1 through 12, `profile_id = NULL`, `amount_ml` 250–1000 ml).
  - Legacy User `147`: 1 row (ID 13, `profile_id = NULL`, `amount_ml = 1000 ml`).
  - Total historical hydration records remain 100% intact with dual-key `amount_ml` populated.

---

## 4. CHECKPOINT SCOPE & EXCLUSIONS

### 4.1 Included Scope (Logical DML Snapshot)
The checkpoint SQL is a transactional DML export structured with strict parent-to-child topological ordering:
1. `public.organizations` (independent root)
2. `public.users` (independent root)
3. `public.profiles` (FK &rarr; `organizations`)
4. `public.organization_members` (FK &rarr; `organizations`, `profiles`)
5. `public.exercise_categories` (independent)
6. `public.exercises` (FK &rarr; `exercise_categories`)
7. `public.legacy_user_id_map` (FK &rarr; `users`, `profiles`)
8. `public.water_logs` (FK &rarr; `users`, `profiles`)
9. `public._migrations` (migration history)
10. Legacy domain tables (captured as 0 rows)
11. Sequence states (`water_logs_id_seq`, `users_id_seq`) for emergency baseline rebuilds.

### 4.2 Explicit Scope Exclusions
The following components are excluded from this logical DML snapshot by design:
1. **Schema DDL**: Does not contain `CREATE TABLE`, `CREATE VIEW`, `CREATE TYPE`, or `CREATE FUNCTION` statements (managed by migrations).
2. **Row Level Security Policies**: Does not contain `CREATE POLICY` statements.
3. **Triggers**: Does not capture trigger creation statements (e.g. `trg_sync_water_logs_compatibility`).
4. **Grants & Roles**: Does not capture object permissions or role memberships.
5. **Supabase Internal Catalogs**: Excludes `auth.users`, `storage.buckets`, and `vault.secrets` for security.
6. **Infrastructure PITR**: Snapshot does not replace Supabase Point-in-Time Recovery.

---

## 5. RECOVERY READINESS REVIEW (DB-4F RUNBOOK VERIFICATION)

The recovery runbook validated in DB-4F was re-verified against Phase 10A:

| Runbook Component | Specification | Verification Result |
| :--- | :--- | :---: |
| **Drop Mode** | Must use `RESTRICT`, never broad `CASCADE` | **CONFIRMED** |
| **Dependency Guard** | PostgreSQL fails closed if unexpected objects depend on `v2_nutrition_logs` | **CONFIRMED** |
| **Pre-Traffic Abort** | Drops view and table with `RESTRICT`; deletes `_migrations` entry | **CONFIRMED** |
| **Post-Traffic Rollback** | Mandates `CREATE TABLE archive_v2_nutrition_logs_<timestamp> AS SELECT * FROM v2_nutrition_logs;` before drop | **CONFIRMED** |
| **Sequence Protection** | Sequence `setval()` is restricted to emergency disaster recovery, never routine rollback | **CONFIRMED** |
| **Replay Conflict Handling** | `INSERT ... ON CONFLICT DO NOTHING` prevents row duplication on repeat execution | **CONFIRMED** |

---

## 6. ISOLATED RESTORE & RECOVERY TEST RESULTS

The fresh checkpoint was tested in an isolated, disposable PostgreSQL 18 test database (`127.0.0.1:5433`). The test suite verified that:
1. Checkpoint connection is strictly local (`127.0.0.1`) and cannot touch remote staging.
2. Fresh checkpoint SQL replays cleanly without syntax or foreign key violations.
3. Duplicate replay is strictly idempotent (zero row duplication).
4. Pre-traffic rollback with `RESTRICT` cleans up Phase 10A cleanly without touching baseline rows.
5. Post-traffic rollback preserves 100% of modern athlete meal records in archive table.
6. `RESTRICT` prevents accidental table deletion if an unexpected dependent view exists.

### Vitest Test Suite Execution
```
 RUN  v4.1.11 C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend

 ✓ tests/integration/db4_real_postgres.integration.test.ts (15 tests) 1941ms
 ✓ tests/integration/db4g_checkpoint_validation.integration.test.ts (5 tests) 554ms
 ✓ tests/integration/phase10a_recovery_validation.integration.test.ts (5 tests) 401ms
 ✓ tests/unit/db4_nutrition_workout_contracts.unit.test.ts (9 tests) 10ms

 Test Files  4 passed (4)
      Tests  34 passed (34)
   Duration  3.95s
```

All 34 DB-4 tests passed with zero failures.

---

## 7. REMAINING LIMITATIONS & KNOWN GAPS

1. **Logical Snapshot Boundary:** The checkpoint is a table-level logical DML snapshot. It does not replace Supabase platform-level WAL archives or Point-in-Time Recovery (PITR).
2. **Post-Capture Drift:** If modifications occur on staging after capture, replaying with `ON CONFLICT DO NOTHING` will not overwrite drifted rows.
3. **No Live Restore Drill:** In compliance with strict safety rules, no restore drill was executed against remote staging (`ymrblyiwohvxptiqjfsi`).

---

## 8. CONFIRMATION OF ZERO REMOTE MUTATIONS

- **Remote Target Project:** Supabase Staging Reference `ymrblyiwohvxptiqjfsi`
- **Total Remote DDL Executed:** **0**
- **Total Remote DML Executed:** **0**
- **Remote Policy Changes:** **0**
- **Remote Migrations Run:** **0**
- **Staging Database State:** **Phase 9B remains deployed, active, and 100% unchanged.**
- **Production Database State:** **Untouched.**

---

## 9. RECOMMENDATION

**Status:** **`PASS`**  
The fresh pre-Phase 10A checkpoint artifact [`striva_staging_checkpoint_pre_phase10a_2026-10-12T06-11-17-818Z.sql`](file:///C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/backups/striva_staging_checkpoint_pre_phase10a_2026-10-12T06-11-17-818Z.sql) and manifest [`striva_staging_checkpoint_manifest_pre_phase10a_2026-10-12T06-11-17-818Z.json`](file:///C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/backups/striva_staging_checkpoint_manifest_pre_phase10a_2026-10-12T06-11-17-818Z.json) are verified, cryptographically matched, topologically ordered, and confirmed suitable as the pre-Phase 10A recovery baseline.

### Targeted Deployment Command (Awaiting Separate Operator Authorization)
```bash
node backend/scripts/apply_staging_migrations.js phase_10a_nutrition_core_schema.sql
```

---

## HALT CONDITION
DB-4G fresh checkpoint creation and verification is complete. **Neither Phase 10A nor Phase 10B has been executed on staging.** No unrelated work has been started. Execution has halted awaiting operator review and explicit deployment authorization.
