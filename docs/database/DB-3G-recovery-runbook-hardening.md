# STRIVA V2 — DB-3G: Recovery Runbook Hardening and Final Safety Review

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Primary Input:** `docs/database/DB-3F-recovery-validation.md`  
**Test Engine:** Disposable Local PostgreSQL 18.3 (`127.0.0.1:5433`)  
**Failure-Injection Suite:** `backend/tests/integration/phase9b_recovery_runbook.integration.test.ts` (6 / 6 passed)  
**Status Gate:** **`GO FOR SEPARATE PHASE 9B STAGING AUTHORIZATION`**  

---

## 1. Executive Summary & Verification Findings

This review completed the hardening and empirical validation of the Phase 9B rollback runbook, sequence management, archive access security, and failure-injection resilience using an isolated, disposable PostgreSQL 18.3 database.

### Final Recommendation: **`GO` (READY FOR SEPARATE EXPLICIT STAGING AUTHORIZATION)**

**Core Technical Achievements:**
1. **Archive Least Privilege Hardened (PASS)**: Corrected the overly permissive grant from earlier drafts. The rollback archive (`_rollback_v2_water_logs_archive_<timestamp>`) is assigned strictly to `postgres`, all access is revoked from `PUBLIC`, `anon`, and `authenticated`, and read/write access is restricted exclusively to `service_role`.
2. **Failure-Injection Test Suite Passed (6 / 6 PASS)**: Verified all six failure-injection scenarios on an ephemeral local PostgreSQL 18 engine, including zero modern rows, multiple modern rows, archive name collision, partial transaction failure, out-of-order sequence IDs, and clean rollback retries.
3. **Sequence Allocation Semantics Proven (PASS)**: Confirmed that dynamic sequence alignment via `GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13)` with `is_called = true` guarantees that the next allocated ID is strictly greater than all surviving rows, completely preventing `23505 unique_violation` primary key collisions.
4. **Authoritative, Collision-Resistant Runbook Codified**: Formulated an ordered, transaction-atomic rollback procedure incorporating table-level write freeze, pre-drop archival, row-count assertions, dynamic sequence alignment, and legacy data verification.
5. **Clear Boundary on Unverified Claims**: Acknowledged that platform PITR remains an inferred capability (no live cluster restore drill executed), and that the DB-3E checkpoint is a DML data snapshot requiring a pre-existing Phase 9A schema.

> [!IMPORTANT]
> **Strict Halt Gate**: This **GO** assessment does **NOT** constitute deployment authorization. Zero remote DDL, DML, or backfills were executed against staging. Phase 9B remains unapplied. DB-4 has not been initiated.

---

## 2. Hardened Rollback Archive Safety Analysis

### 2.1 Least Privilege and Access Security
In previous drafts, `GRANT SELECT ... TO authenticated` was proposed. Forensic security review determined that standard authenticated app users have **no valid operational justification** to access disaster-recovery archival tables containing raw data from multiple tenants or members.

**Hardened Permission Directives:**
```sql
ALTER TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS OWNER TO postgres;
REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS TO service_role;
```
*Empirical Test Result*: Verified in Scenario 2 that executing `SET LOCAL ROLE authenticated` results in `42501 permission denied for table _rollback_v2_water_logs_archive_test`.

### 2.2 Collision Prevention & Idempotency
- **The Risk**: A static table name (`_rollback_v2_water_logs_archive`) will fail with `42P07: relation already exists` if an archive table was created during a prior attempt, or silently corrupt counts if `IF NOT EXISTS` is naively used.
- **The Hardened Protocol**:
  1. The runbook generates a deterministic UTC timestamped table name: `_rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS`.
  2. The transaction performs an explicit preflight collision check:
     ```sql
     IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_archive_table) THEN
         RAISE EXCEPTION 'Rollback aborted: archive table % already exists. Specify a new suffix.', v_archive_table;
     END IF;
     ```
*Empirical Test Result*: Verified in Scenario 3 that collisions fail closed with an explicit error before any schema alterations occur.

### 2.3 Write Freeze & Concurrent Modification Protection
To eliminate race conditions between the archival `SELECT` and the subsequent `DROP COLUMN profile_id`, an exclusive table lock must be acquired at the very beginning of the transaction:
```sql
BEGIN;
LOCK TABLE public.water_logs IN EXCLUSIVE MODE;
```
This blocks concurrent client `INSERT`, `UPDATE`, and `DELETE` transactions until the rollback transaction either commits or rolls back, guaranteeing zero orphaned writes.

### 2.4 Field Completeness & Modern Record Preservation
The archive creates a full-fidelity replica (`SELECT ... FROM public.water_logs WHERE profile_id IS NOT NULL OR user_id IS NULL;`), preserving:
- `id` (integer primary key)
- `user_id` (translated legacy integer ID for mapped profiles, or NULL for unmapped)
- `profile_id` (UUID foreign key to `public.profiles`, preserving user identity)
- `amount_ml` (V2 canonical volume)
- `intake_amount` (legacy compatibility volume)
- `intake_type` (e.g. `'water'`)
- `source` (e.g. `'manual'`)
- `created_at` (timestamptz audit timestamp)
- `archive_classification` (`'modern_mapped'` vs `'modern_unmapped'`)
- `archived_at` (timestamptz UTC execution stamp)

This prevents the data-loss path identified in DB-3H where records created by mapped profiles (`user_id = 148` or `151`) would have had their `profile_id` stripped during rollback.

### 2.5 Lifecycle, Retention & Cleanup Policy
- **Retention Period**: 30 days in live staging or until DB-4 migration reconciles modern records into canonical `public.v2_water_logs`.
- **Cleanup Directive**: Dropping the archive requires explicit DBA review after DB-4 reconciliation verification.

---

## 3. Sequence Recovery Semantics Analysis

### 3.1 PostgreSQL Sequence Behavior
The sequence `public.water_logs_id_seq` governs identity generation for hydration records. A naive rewind to a hardcoded value (e.g. `setval(..., 13, true)`) causes immediate `23505 unique_violation` collisions if post-migration writes inserted rows with IDs $\ge 14$.

### 3.2 Dynamic Sequence Formula
The hardened runbook mandates the following dynamic evaluation:
```sql
SELECT setval(
    'public.water_logs_id_seq', 
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
    true
);
```

### 3.3 State Evaluation Matrix
| Scenario | Table State | `MAX(id)` | Evaluated `setval` | `is_called` | Next `nextval()` Output | Collision Risk |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **No post-migration writes** | 13 legacy rows (IDs 1–13) | 13 | 13 | `true` | **14** | **Zero** |
| **3 modern writes post-migration** | IDs 1–16 present | 16 | 16 | `true` | **17** | **Zero** |
| **Out-of-order large ID write** | Surviving row has ID 99 | 99 | 99 | `true` | **100** | **Zero** |
| **Empty table (edge case)** | Table truncated (0 rows) | NULL | 13 | `true` | **14** | **Zero** |

*PostgreSQL Semantics Note*: When `is_called = true`, PostgreSQL increments the counter before returning the next value. Because rows up to `MAX(id)` already exist, `is_called = true` ensures that the subsequent insert receives `MAX(id) + 1`.

---

## 4. Local Failure-Injection Test Suite Results

The failure-injection test suite ([`backend/tests/integration/phase9b_recovery_runbook.integration.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/integration/phase9b_recovery_runbook.integration.test.ts)) was executed against disposable local PostgreSQL 18.3 (`127.0.0.1:5433`):

```
 ✓ tests/integration/phase9b_recovery_runbook.integration.test.ts (6 tests) 385ms
   ✓ Scenario 1: Rolls back cleanly when zero modern rows exist; preserves 13 legacy rows
   ✓ Scenario 2: Safely archives multiple modern rows with profile_id intact; preserves legacy rows and sequence continuity
   ✓ Scenario 3: Prevents silent overwrite when archive table already exists; fails closed with explicit error
   ✓ Scenario 4: Ensures transaction rollback restores previous state if failure occurs partway through rollback
   ✓ Scenario 5: Dynamic setval guarantees next ID is strictly greater than all surviving rows (no PK collision)
   ✓ Scenario 6: Allows clean retry of rollback after previous aborted attempt
```

### 4.1 Scenario Breakdown & Observations
1. **Scenario 1 (No modern rows)**: Executed rollback on 13 baseline rows. Archive was created with 0 rows (`0 == 0` asserted). Compatibility columns dropped. Legacy rows intact. Next ID allocated was 14.
2. **Scenario 2 (Multiple modern rows with `user_id IS NULL`)**: 3 modern records inserted (`profile_id` set, `amount_ml` 500, 750, 1000). Archive created and verified with 3 rows. Compatibility columns dropped. Sequence set to 16; next allocation produced 17. Authenticated role verified blocked from archive (`42501 permission denied`).
3. **Scenario 3 (Archive already exists)**: Pre-created conflicting archive table. Attempting rollback failed closed immediately with `relation already exists`. Transaction rolled back cleanly without touching schema.
4. **Scenario 4 (Mid-rollback failure injection)**: Deliberate division-by-zero error injected after archive creation and trigger drop, but before commit. PostgreSQL transactional DDL rolled back completely: `profile_id` column remained, trigger remained, and uncommitted archive vanished.
5. **Scenario 5 (Sequence recovery with large ID)**: Row with ID 99 inserted. Dynamic `setval` evaluated to 99. Next `nextval` produced 100; subsequent insert received 101 with zero primary key collisions.
6. **Scenario 6 (Rollback retry after failure)**: Injected failure in Attempt 1 (clean rollback). Attempt 2 executed complete rollback procedure successfully. 13 legacy rows preserved; modern row preserved in retry archive.

---

## 5. Corrected, Authoritative Recovery & Rollback Runbook

In the event that Phase 9B must be rolled back on staging, the operator must execute this exact transaction-atomic procedure:

```sql
-- ====================================================================
-- STRIVA V2 HARDENED ROLLBACK & RECOVERY PROCEDURE (DB-3G AUTHORITATIVE)
-- Target Project: ymrblyiwohvxptiqjfsi
-- ====================================================================

-- STEP 1: Begin Atomic Transaction & Acquire Write Freeze
BEGIN;
LOCK TABLE public.water_logs IN EXCLUSIVE MODE;

-- STEP 2: Collision Check & Archival Snapshot of Modern V2 Records
DO $$
DECLARE
    v_archive_name TEXT := '_rollback_v2_water_logs_archive_' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD_HH24MISS');
    v_src_count INT;
    v_arch_count INT;
BEGIN
    -- Check for name collision
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_archive_name) THEN
        RAISE EXCEPTION 'Rollback aborted: archive table % already exists.', v_archive_name;
    END IF;

    -- Create archival snapshot capturing ALL modern records (both mapped and unmapped)
    -- Preserves profile_id UUID identity before column drop
    EXECUTE format('
        CREATE TABLE public.%I AS 
        SELECT 
            id, user_id, profile_id, amount_ml, intake_amount, intake_type, source, created_at,
            CASE 
                WHEN user_id IS NULL THEN ''modern_unmapped''
                WHEN profile_id IS NOT NULL AND user_id IS NOT NULL THEN ''modern_mapped''
                ELSE ''legacy_record''
            END AS archive_classification,
            NOW() AT TIME ZONE ''UTC'' AS archived_at
        FROM public.water_logs 
        WHERE profile_id IS NOT NULL OR user_id IS NULL;
    ', v_archive_name);

    -- Enforce Least Privilege on Archive
    EXECUTE format('
        ALTER TABLE public.%I OWNER TO postgres;
        REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;
        GRANT ALL ON TABLE public.%I TO service_role;
    ', v_archive_name, v_archive_name, v_archive_name);

    -- STEP 3: Verify Archival Row Count Assertion (Exhaustive Modern Record Gate)
    SELECT COUNT(*) INTO v_src_count FROM public.water_logs WHERE profile_id IS NOT NULL OR user_id IS NULL;
    EXECUTE format('SELECT COUNT(*) FROM public.%I;', v_archive_name) INTO v_arch_count;

    IF v_src_count != v_arch_count THEN
        RAISE EXCEPTION 'Rollback aborted: archive count (%) != source modern records (%). Data loss prevented!', 
            v_arch_count, v_src_count;
    END IF;

    RAISE NOTICE 'Rollback archival verified: % modern records preserved in %', v_arch_count, v_archive_name;
END $$;

-- STEP 4: Remove Phase 9B Database Objects
DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();
DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
DROP TABLE IF EXISTS public.legacy_user_id_map;

-- STEP 5: Drop Compatibility Columns
ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id;
ALTER TABLE public.water_logs DROP COLUMN IF EXISTS amount_ml;

-- STEP 6: Reconcile Migration Tracking
DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql';

-- STEP 7: Align Sequence Counter Safely
SELECT setval(
    'public.water_logs_id_seq', 
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
    true
);

-- STEP 8: Legacy Row Count Preservation Gate
DO $$
DECLARE
    v_legacy_count INT;
BEGIN
    SELECT COUNT(*) INTO v_legacy_count FROM public.water_logs WHERE id <= 13;
    IF v_legacy_count != 13 THEN
        RAISE EXCEPTION 'Rollback failed: legacy water_logs count dropped to % (expected exactly 13). Data loss detected!', 
            v_legacy_count;
    END IF;
    RAISE NOTICE 'Rollback complete: all 13 legacy hydration records intact.';
END $$;

COMMIT;
```

---

## 6. Remaining Limitations & Unverified Recovery Claims

1. **PITR Restore Capability Remains Inferred**: Platform Point-in-Time Recovery is active on Supabase project `ymrblyiwohvxptiqjfsi`, but has not been tested with a live restore drill in this session (strictly complying with safety constraints).
2. **Logical Snapshot is DML-Only**: The checkpoint file (`striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql`) contains data insert statements, not DDL schema creation. Replaying it into a completely blank database requires pre-executing Phase 1 through Phase 9A migrations.
3. **Modern Hydration Reconciliation in DB-4**: If modern records are archived during rollback, restoring them into production requires transferring them into `public.v2_water_logs` in the upcoming DB-4 migration.

---

## 7. Final Recommendation Gate

### **`GO FOR SEPARATE PHASE 9B STAGING AUTHORIZATION`**

All safety gates, sequence semantics, archive security controls, and failure-injection resilience tests have been proven in real PostgreSQL 18.3. The runbook is fully hardened and ready for deployment.

**Strict Halt**: Stand by for explicit operator authorization. Do not apply Phase 9B or begin DB-4.
