# STRIVA V2 — DB-3F: Logical Backup and Recovery Procedure Validation

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Evaluated Checkpoint Artifact:** `striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql`  
**Status Gate:** **CONDITIONAL GO (READY FOR EXPLICIT AUTHORIZATION UNDER CORRECTED RECOVERY PROTOCOL)**  

---

## 1. Executive Summary & Assessment

A comprehensive forensic audit of the pre-migration backup checkpoint artifact generated in DB-3E, its manifest, and the proposed recovery and replay procedures was conducted.

### Final Recommendation: **`CONDITIONAL GO`**

**Key Findings:**
1. **Artifact Verification & Integrity (PASS)**: The checkpoint SQL file was located on disk in secure local storage, its byte length (11,499 bytes) confirmed, and its SHA-256 digest (`36854e...`) verified as an **exact 100% match** against the DB-3E manifest.
2. **Export Format Nature (Data-Only Snapshot)**: The checkpoint is a **DML-only logical insert snapshot** using `INSERT INTO ... ON CONFLICT (id) DO NOTHING` and `SELECT setval(...)`. It contains **NO executable DDL** (`CREATE TABLE`, `CREATE INDEX`, `CREATE POLICY`, `GRANT`).
3. **Replay Scenario 1 (Empty Disposable Database - INCOMPLETE WITHOUT DDL)**: Replaying the export directly into an empty database would fail immediately with `42P01: relation does not exist`. It requires the STRIVA V2 Phase 9A baseline schema to be pre-initialized.
4. **Replay Scenario 2 (Partially Migrated Staging after Rollback - DEFECT IDENTIFIED & CORRECTED)**:
   - In DB-3E Section 4.2 ("Logical Snapshot Replay Procedure"), the text omitted the mandatory modern record archival step (`CREATE TABLE _rollback_v2_water_logs_archive`) before dropping `profile_id`, which would permanently orphan modern post-migration hydration records.
   - The hardcoded sequence reset `SELECT setval('water_logs_id_seq', 13, true)` risks primary key collisions if post-migration writes inserted records with IDs $> 13$ before rollback.
5. **No Secrets or Token Exposure (PASS)**: Zero database passwords, JWT tokens, OAuth access tokens, or service role keys are present in the export.
6. **Strict Safety Compliance**: Phase 9B remains completely **unapplied**. Zero remote DDL, DML, or replay commands were executed against staging. DB-4 has not been started.

---

## 2. Verification of the Actual Checkpoint Artifact

### 2.1 File Location & Cryptographic Verification
The checkpoint artifact was located and inspected on disk in restricted local AppData storage:

| Metric / Attribute | Recorded in Manifest | Recalculated from Disk | Verification Evaluation |
| :--- | :--- | :--- | :---: |
| **Absolute Path** | `<AppDataDir>/scratch/backups/...` | `C:\Users\priyanashu\.gemini\antigravity-ide\brain\14af1959-57c6-4ca2-a82c-b5447425be11\scratch\backups\striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql` | **CONFIRMED** |
| **Manifest Path** | `<AppDataDir>/scratch/backups/...` | `C:\Users\priyanashu\.gemini\antigravity-ide\brain\14af1959-57c6-4ca2-a82c-b5447425be11\scratch\backups\striva_staging_checkpoint_manifest_2026-10-11T15-59-17-893Z.json` | **CONFIRMED** |
| **File Size** | `11,499 bytes` | `11,499 bytes` | **EXACT MATCH** |
| **Total Lines** | `90 lines` | `90 lines` (34 comment lines, 56 SQL lines) | **EXACT MATCH** |
| **SHA-256 Hash** | `36854e617f6a59794094...` | `36854e617f6a597940942784c9cccc36b529a97759b92040693da4a076e9c2d9` | **EXACT MATCH** |

### 2.2 Export Format & Generator Mechanism
- **Generation Method**: Programmatic extraction via Node.js `pg` client querying live staging tables under SSL connection.
- **Statement Structure**:
  - `INSERT INTO public.water_logs (...) VALUES (...) ON CONFLICT (id) DO NOTHING;` (13 statements)
  - `INSERT INTO public.users (...) VALUES (...) ON CONFLICT (id) DO NOTHING;` (7 statements)
  - `INSERT INTO public.profiles (...) VALUES (...) ON CONFLICT (id) DO NOTHING;` (5 statements)
  - `INSERT INTO public._migrations (...) VALUES (...) ON CONFLICT (name) DO NOTHING;` (22 statements)
  - `SELECT setval('public.water_logs_id_seq', 13, true);` (1 statement)
  - `SELECT setval('public.users_id_seq', 153, true);` (1 statement)

### 2.3 Distinction: File Integrity vs. Actual Restore Verification
- **File Integrity Verification**: Confirms that the file exists, has not been tampered with or corrupted, and matches its cryptographic digest. **Status: VERIFIED.**
- **Actual Restore Verification**: Executing the SQL against a real database instance to verify schema creation, data insertion, foreign key resolution, and trigger functionality. **Status: UNVERIFIED ON STAGING (by safety rule); ANALYTICALLY EVALUATED BELOW.**

---

## 3. Export Completeness Assessment

### 3.1 Content Matrix
| Database Component | In Export? | Details / Findings | Assessment |
| :--- | :---: | :--- | :---: |
| **Table Data (DML)** | **YES** | All 13 hydration rows, 7 legacy users, 5 profiles, 22 migration records | **COMPLETE** |
| **Sequence State** | **YES** | `setval` calls for `water_logs_id_seq` (13) and `users_id_seq` (153) | **COMPLETE** |
| **Table DDL (`CREATE TABLE`)** | **NO** | Schemas documented as informational comments only (`-- Columns: ...`) | **OMITTED** |
| **Constraints & FKs** | **NO** | Primary keys, foreign keys, and unique constraints are not defined | **OMITTED** |
| **Indexes** | **NO** | No `CREATE INDEX` statements included | **OMITTED** |
| **Triggers & Functions** | **NO** | No trigger functions or `CREATE TRIGGER` statements included | **OMITTED** |
| **RLS Policies & Grants** | **NO** | No `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, or `GRANT` calls | **OMITTED** |
| **Auth Schema (`auth.users`)** | **NO** | Profiles reference `auth.users(id)`; auth table data not exported | **OMITTED** |

### 3.2 Sensitive Data & Secrets Audit
- **Password Scan**: Scanned for password strings, hash values, or credentials. Result: **CLEAN (0 found)**.
- **JWT / OAuth Scan**: Scanned for JWT tokens (`ey...`), bearer tokens, and OAuth secrets. Result: **CLEAN (0 found)**.
- **Service Role Key Scan**: Scanned for Supabase service role secret keys. Result: **CLEAN (0 found)**.
- **PII Handling**: User emails and display names present in the backup are local development/staging fixtures (`user148@striva.app`, etc.) and are kept strictly within local restricted storage.

---

## 4. Replay-Safety Assessment

### 4.1 Scenario 1: Replay into an Empty Disposable Database
If an operator attempts to run `psql <db_url> -f striva_staging_checkpoint_pre_phase9b_....sql` against a blank PostgreSQL database:

| Evaluation Aspect | Findings & Behavior | Risk Level |
| :--- | :--- | :---: |
| **Table Existence** | **FAILS IMMEDIATELY**: `ERROR: relation "public.water_logs" does not exist`. The file contains no `CREATE TABLE` DDL. | **HIGH (Execution Blocked)** |
| **Foreign Key to Auth** | **FAILS**: `public.profiles` references `auth.users(id)`. An empty database lacks schema `auth` and table `auth.users`. | **HIGH (FK Violation)** |
| **Sequence Existence** | **FAILS**: `SELECT setval('public.water_logs_id_seq', ...)` fails because the sequence does not exist. | **MEDIUM** |
| **Precondition Required** | The database must first execute the STRIVA V2 baseline migration sequence up to Phase 9A (`phase_9a_rls_recursion_fix.sql`) before this data snapshot can be applied. | **MANDATORY PRECONDITION** |

### 4.2 Scenario 2: Replay into Partially Migrated Staging after Rollback
If Phase 9B was partially applied or failed, the operator executed schema rollback DDL, and then attempted to replay the export:

| Evaluation Aspect | Findings & Behavior | Risk Level |
| :--- | :--- | :---: |
| **Row Duplication Risk** | **SAFE**: Every row uses `ON CONFLICT (id) DO NOTHING`. The 13 original hydration rows will not be duplicated. | **LOW** |
| **Row Mutation Reversion** | **LIMITATION**: If an in-place column update occurred on an existing row (e.g. `amount_ml` backfill), `ON CONFLICT DO NOTHING` will skip the row rather than reverting modified column values. | **MEDIUM** |
| **Sequence Rewind Risk** | **CRITICAL DEFECT IDENTIFIED**: The export contains hardcoded `SELECT setval('public.water_logs_id_seq', 13, true)`. If modern hydration records were inserted post-migration (e.g. IDs 14, 15, 16) prior to rollback, resetting the sequence to 13 will cause subsequent client inserts to fail with `23505 unique_violation`. | **HIGH (Defect)** |
| **Modern Record Identity Loss** | **CRITICAL DEFECT IDENTIFIED**: If rollback drops column `profile_id` without first creating `_rollback_v2_water_logs_archive`, all modern records created with `user_id IS NULL` permanently lose their identity association. Replaying the pre-migration export does not restore modern records (it only contains the 13 legacy rows). | **HIGH (Data Loss)** |
| **Ownership & Role Safety** | **SAFE**: All statements run under `postgres` role; no role switches. | **LOW** |

---

## 5. Rollback Consistency Review & Defect Remediation

### 5.1 Reconciliation of Rollback Procedures Across Documents
A comparison of documented recovery procedures revealed a discrepancy:
- In [`phase_9b_legacy_identity_bridge.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql) and [`docs/database/DB-3D-final-deployment-gate.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-3D-final-deployment-gate.md), the rollback runbook correctly mandated an **archival snapshot** of modern records with `user_id IS NULL` before dropping compatibility columns.
- However, in [`docs/database/DB-3E-pre-migration-backup-checkpoint.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-3E-pre-migration-backup-checkpoint.md) Section 4.2 ("Logical Snapshot Replay Procedure"), the instructions omitted this archival step and proposed a direct `ALTER TABLE water_logs DROP COLUMN profile_id`.
- **Engineering Verdict**: The DB-3E Section 4.2 procedure was incomplete. Reverting compatibility columns without archiving modern records constitutes an unacceptable data loss risk.

### 5.2 Required Remediations
1. **Mandatory Archival Gate**: Rollback must never drop `profile_id` without first executing:
   ```sql
   CREATE TABLE public._rollback_v2_water_logs_archive_YYYYMMDD AS
   SELECT * FROM public.water_logs WHERE user_id IS NULL;
   ```
2. **Safe Sequence Counter Reset**: Sequence resets must never hardcode a lower number; they must dynamically use the maximum existing ID:
   ```sql
   SELECT setval('public.water_logs_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), true);
   ```
3. **Replay Reversion Policy**: If historical hydration records were altered prior to rollback, `TRUNCATE TABLE public.water_logs CASCADE` should be executed inside the rollback transaction before replaying the 13 historical rows.

---

## 6. Corrected, Authoritative Step-by-Step Recovery Plan

If Phase 9B must be rolled back or recovered, the operator must execute the following unified, transaction-atomic procedure:

```sql
-- ====================================================================
-- STRIVA V2 AUTHORITATIVE RECOVERY & ROLLBACK RUNBOOK
-- ====================================================================

-- STEP 1: Operator Write Freeze
BEGIN;
LOCK TABLE public.water_logs IN EXCLUSIVE MODE;

-- STEP 2: Pre-Drop Archival of Modern V2 Hydration Records
-- Preserves all post-migration records where user_id IS NULL
CREATE TABLE IF NOT EXISTS public._rollback_v2_water_logs_archive_20261011 AS
SELECT * FROM public.water_logs WHERE user_id IS NULL;

-- Restrict archive access
REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_20261011 FROM PUBLIC, anon;
GRANT SELECT ON TABLE public._rollback_v2_water_logs_archive_20261011 TO authenticated, service_role;

-- STEP 3: Validate Archival Row Count Assertion
DO $$
DECLARE
    v_src INT;
    v_arch INT;
BEGIN
    SELECT COUNT(*) INTO v_src FROM public.water_logs WHERE user_id IS NULL;
    SELECT COUNT(*) INTO v_arch FROM public._rollback_v2_water_logs_archive_20261011;
    IF v_src != v_arch THEN
        RAISE EXCEPTION 'Rollback aborted: archive count (%) does not match source records with user_id IS NULL (%).', v_arch, v_src;
    END IF;
END $$;

-- STEP 4: Remove Phase 9B Triggers, Functions & Policies
DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();
DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
DROP TABLE IF EXISTS public.legacy_user_id_map;

-- STEP 5: Drop Compatibility Columns (Safe now that modern records are archived)
ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id;
ALTER TABLE public.water_logs DROP COLUMN IF EXISTS amount_ml;

-- STEP 6: Reconcile Migration Tracking
DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql';

-- STEP 7: Re-align Sequence Counter Safely (Never rewinds below maximum existing ID)
SELECT setval(
    'public.water_logs_id_seq', 
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
    true
);

-- STEP 8: Verify Legacy Row Preservation Gate
DO $$
DECLARE
    v_legacy_count INT;
BEGIN
    SELECT COUNT(*) INTO v_legacy_count FROM public.water_logs WHERE id <= 13;
    IF v_legacy_count != 13 THEN
        RAISE EXCEPTION 'Rollback failed: legacy water_logs count dropped to % (expected exactly 13).', v_legacy_count;
    END IF;
END $$;

COMMIT;
```

---

## 7. Proposed Disposable-Environment Restore Validation Plan

To validate the checkpoint replay without risking staging:

1. **Sandbox Environment**: Ephemeral local PostgreSQL 18 instance running on `127.0.0.1:5433` (as used in DB-3B).
2. **Phase 1: Baseline Schema Provisioning**:
   - Apply Phase 1 through Phase 9A migrations to establish tables, schemas (`auth`, `public`), and sequences.
3. **Phase 2: Checkpoint Replay Execution**:
   - Replay `striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql`.
   - Assert all 13 hydration rows, 7 legacy users, 5 profiles, and 22 migration records are present.
4. **Phase 3: Rollback Simulation**:
   - Apply Phase 9B.
   - Insert modern mock rows with `user_id IS NULL`.
   - Execute the Corrected Recovery Plan (Section 6).
   - Assert all 13 legacy rows remain intact and modern rows are safely captured in archive.
5. **Sandbox Teardown**: Stop daemon and delete ephemeral data cluster.

---

## 8. Final Status Gate

### Recommendation: **`CONDITIONAL GO`**

**Conditions for Staging Authorization**:
1. Operators must strictly follow the **Corrected Recovery Plan** (Section 6) rather than the incomplete replay snippet in DB-3E.
2. The pre-migration checkpoint artifact (`striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql`) is retained in secure storage as the official pre-migration DML baseline.
3. Automated Supabase PITR at UTC timestamp `2026-10-11T15:59:17.893Z` remains the primary cluster-level recovery mechanism.

**Halt**: Stand by for explicit operator authorization. Do not apply Phase 9B or begin DB-4.
