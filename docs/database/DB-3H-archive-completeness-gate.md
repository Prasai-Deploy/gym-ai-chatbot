# STRIVA V2 — DB-3H: Modern Identity Preservation and Archive Completeness Gate

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Primary References:** 
- `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`
- `docs/database/DB-3G-recovery-runbook-hardening.md`
- `backend/tests/integration/phase9b_recovery_runbook.integration.test.ts`
- `backend/tests/security/phase9b_identity_bridge.security.test.ts`
**Test Engine:** Disposable Local PostgreSQL 18.3 (`127.0.0.1:5433`)  
**Integration Test Suite:** `backend/tests/integration/phase9b_recovery_runbook.integration.test.ts` (7 / 7 passed)  
**Security Test Suite:** `backend/tests/security/phase9b_identity_bridge.security.test.ts` (26 / 26 passed)  
**Status Gate:** **`GO FOR SEPARATE PHASE 9B STAGING AUTHORIZATION`**  

---

## 1. Executive Summary

This engineering gate report resolves a critical data-loss vulnerability discovered in earlier drafts of the Phase 9B rollback runbook.

### The Problem
The rollback archive previously queried:
```sql
SELECT * FROM public.water_logs WHERE user_id IS NULL;
```
However, the Phase 9B compatibility trigger `sync_water_logs_compatibility()` automatically resolves mapped profile UUIDs to non-NULL legacy integer `user_id` values (specifically Legacy User 148 for profile `b96c0b60...` and Legacy User 151 for profile `2dbbad1d...`). Consequently:
- Modern hydration records authored by mapped users received non-NULL integer IDs (`148` or `151`).
- The naive `WHERE user_id IS NULL` filter failed to match these records.
- Dropping `profile_id` during a subsequent rollback permanently severed the modern UUID profile ownership links, leaving them as untracked legacy records and causing silent identity data loss.

### The Resolution
1. **Hardened Archival Formulation**: Replaced the naive predicate with an exhaustive modern record filter:
   ```sql
   WHERE profile_id IS NOT NULL OR user_id IS NULL
   ```
2. **Provenance & Classification Tracking**: Added an explicit classification column (`archive_classification`) that tags records as `'modern_mapped'` versus `'modern_unmapped'`.
3. **Provable Non-Interference**: Demonstrated that all 13 baseline historical legacy records have `profile_id IS NULL` and `user_id IS NOT NULL`, meaning they are strictly excluded from the archive and remain in `public.water_logs`.
4. **Empirical Validation**: Added Scenario 7 to `phase9b_recovery_runbook.integration.test.ts`. All 7 integration scenarios and 26 security tests passed against an isolated local PostgreSQL 18.3 instance.
5. **Least Privilege & Fail-Closed Assertions**: Hardened archive permissions (`postgres` ownership, access revoked from `PUBLIC`/`anon`/`authenticated`, granted strictly to `service_role`) and enforced in-transaction count assertions that abort (`ROLLBACK`) on any mismatch.

> [!IMPORTANT]
> **Strict Halt Boundary**: Staging has not been modified. Phase 9B remains unapplied. DB-4 must not begin until explicit operator authorization is granted.

---

## 2. Root Cause Analysis & Scenario Impact Matrix

### 2.1 Trigger Mechanics & Identity Translation
When a modern client inserts a record into `public.water_logs`, it provides `profile_id` (and optionally `amount_ml`). The Phase 9B trigger executes:

```sql
IF NEW.profile_id IS NOT NULL AND NEW.user_id IS NULL THEN
    SELECT legacy_integer_id INTO v_mapped_legacy_id
    FROM public.legacy_user_id_map
    WHERE profile_id = NEW.profile_id;

    IF FOUND THEN
        NEW.user_id := v_mapped_legacy_id;
    END IF;
END IF;
```

Because Phase 9B seeds authoritative identity bridges for:
- Profile `b96c0b60-9a8b-496f-9e33-f533982412f6` $\leftrightarrow$ Legacy ID `148`
- Profile `2dbbad1d-5988-4d6f-8c32-5c57080e56f5` $\leftrightarrow$ Legacy ID `151`

Any hydration record inserted by either mapped profile results in a row with:
- `profile_id` = `<UUID>`
- `user_id` = `148` or `151` (strictly non-NULL!)

### 2.2 Forensic Breakdown of the 4 Key Scenarios

| Scenario | Author / Origin | Row State in `water_logs` | Result Under Naive Archive (`WHERE user_id IS NULL`) | Result Under Corrected Archive (`WHERE profile_id IS NOT NULL OR user_id IS NULL`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Mapped User 148** | Modern client (`profile_id = 'b96c0b60...'`) | `profile_id = 'b96c0b60...'`<br>`user_id = 148` | **EXCLUDED (DATA LOSS)**.<br>`user_id` is 148 (not null). Row is not archived. `DROP COLUMN profile_id` permanently destroys UUID ownership. | **CAPTURED & PRESERVED**.<br>`profile_id IS NOT NULL` evaluates to `TRUE`. Archived with classification `'modern_mapped'`. |
| **2. Mapped User 151** | Modern client (`profile_id = '2dbbad1d...'`) | `profile_id = '2dbbad1d...'`<br>`user_id = 151` | **EXCLUDED (DATA LOSS)**.<br>`user_id` is 151 (not null). Row is not archived. `DROP COLUMN profile_id` permanently destroys UUID ownership. | **CAPTURED & PRESERVED**.<br>`profile_id IS NOT NULL` evaluates to `TRUE`. Archived with classification `'modern_mapped'`. |
| **3. Unmapped Net-New User** | Modern client (`profile_id = '2d27bc46...'`) | `profile_id = '2d27bc46...'`<br>`user_id = NULL` | **CAPTURED**.<br>`user_id` is null. Row is archived. | **CAPTURED & PRESERVED**.<br>`profile_id IS NOT NULL` and `user_id IS NULL` evaluate to `TRUE`. Archived with classification `'modern_unmapped'`. |
| **4. Existing Legacy User (153 / 147)** | Pre-migration legacy client / historical log | `profile_id = NULL`<br>`user_id = 153` or `147` | **EXCLUDED**.<br>`user_id` is non-null. Row remains in `water_logs`. | **STRICTLY EXCLUDED**.<br>`profile_id IS NOT NULL` is `FALSE`; `user_id IS NULL` is `FALSE`. Row remains safely in `water_logs`. |

---

## 3. Corrected Archive and Recovery Strategy

### 3.1 Provenance Predicate & Non-Interference Proof

The archival query is structured as:
```sql
CREATE TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS AS
SELECT 
    id, 
    user_id, 
    profile_id, 
    amount_ml, 
    intake_amount, 
    intake_type, 
    source, 
    created_at,
    CASE 
        WHEN user_id IS NULL THEN 'modern_unmapped'
        WHEN profile_id IS NOT NULL AND user_id IS NOT NULL THEN 'modern_mapped'
        ELSE 'legacy_record'
    END AS archive_classification,
    NOW() AT TIME ZONE 'UTC' AS archived_at
FROM public.water_logs
WHERE profile_id IS NOT NULL OR user_id IS NULL;
```

#### Mathematical Proof of Exclusion for Historical Legacy Records:
Let $R$ be an existing legacy row created prior to Phase 9B.
1. Historical legacy rows were inserted when `profile_id` did not exist. By definition, `R.profile_id IS NULL`.
2. Historical legacy rows possess an integer foreign key `user_id` (e.g. 153, 147). By definition, `R.user_id IS NOT NULL`.
3. The predicate evaluates:
   $$\text{Predicate}(R) = (\text{NULL IS NOT NULL}) \lor (\text{non-NULL IS NULL}) = \text{FALSE} \lor \text{FALSE} = \text{FALSE}$$
4. Therefore, $\text{Predicate}(R)$ is strictly false for all 13 baseline legacy rows on staging. No historical legacy row can ever be copied into the archive or misclassified.

### 3.2 Security & Least Privilege Enforcement
To ensure disaster-recovery archives cannot be accessed or manipulated by untrusted actors:
```sql
ALTER TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS OWNER TO postgres;
REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS TO service_role;
```
- **Ownership**: Reassigned to `postgres` (or supabase admin).
- **Hardened Revocation**: All privileges revoked from `PUBLIC`, `anon`, and `authenticated`.
- **Restricted Access**: Granted exclusively to backend `service_role`.

### 3.3 Fail-Closed Archival Count Assertion Gate
Before dropping any compatibility columns (`profile_id`, `amount_ml`), an in-transaction PL/pgSQL assertion checks that the archive row count matches the exact count of modern records:

```sql
DO $$
DECLARE
    v_src_count INT;
    v_arch_count INT;
BEGIN
    SELECT COUNT(*) INTO v_src_count 
    FROM public.water_logs 
    WHERE profile_id IS NOT NULL OR user_id IS NULL;

    EXECUTE format('SELECT COUNT(*) FROM public.%I;', v_archive_name) INTO v_arch_count;

    IF v_src_count != v_arch_count THEN
        RAISE EXCEPTION 'Rollback aborted: archive count (%) != source modern records (%). Data loss prevented!', 
            v_arch_count, v_src_count;
    END IF;
END $$;
```
If any discrepancy occurs, the transaction aborts with an exception, rolling back all uncommitted changes and preserving `profile_id`.

### 3.4 Dynamic Sequence Alignment
```sql
SELECT setval(
    'public.water_logs_id_seq', 
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.water_logs), 13), 
    true
);
```
With `is_called = true`, PostgreSQL increments before allocating. Even if modern inserts reached ID 16 or 99, the next legacy insert is guaranteed to receive $\text{MAX}(id) + 1$, completely preventing `23505 unique_violation`.

---

## 4. Restoration and DB-4 Reconciliation Blueprint

If a rollback occurs and an archive table `_rollback_v2_water_logs_archive_<timestamp>` exists, subsequent restoration (or migration to DB-4 `public.v2_water_logs`) must handle both classes of preserved records without creating duplicate or conflicting keys:

### 4.1 Reconciling `modern_mapped` Records
- **State**: The record still exists in `public.water_logs` as an integer ID row (e.g. `id = 14`, `user_id = 148`), but its `profile_id` was dropped from `public.water_logs`.
- **Restoration Protocol**:
  1. The archive preserves both `id = 14` and `profile_id = 'b96c0b60...'`.
  2. In DB-4, when populating `public.v2_water_logs`:
     ```sql
     INSERT INTO public.v2_water_logs (id, profile_id, amount_ml, logged_at, created_at)
     SELECT 
         arch.id, 
         arch.profile_id, 
         arch.amount_ml, 
         arch.created_at, 
         arch.created_at
     FROM public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS arch
     WHERE arch.archive_classification = 'modern_mapped'
     ON CONFLICT (id) DO UPDATE 
     SET profile_id = EXCLUDED.profile_id;
     ```
  3. No duplicate rows are created, and modern UUID ownership is fully restored.

### 4.2 Reconciling `modern_unmapped` Records
- **State**: The record exists in `public.water_logs` with `user_id = NULL` (or was purged during legacy sanitization).
- **Restoration Protocol**:
  1. The archive holds `id`, `profile_id = '2d27bc46...'`, and `amount_ml`.
  2. Insert into `public.v2_water_logs` using the preserved `profile_id`:
     ```sql
     INSERT INTO public.v2_water_logs (profile_id, amount_ml, logged_at, created_at)
     SELECT arch.profile_id, arch.amount_ml, arch.created_at, arch.created_at
     FROM public._rollback_v2_water_logs_archive_YYYYMMDD_HHMMSS arch
     WHERE arch.archive_classification = 'modern_unmapped';
     ```

---

## 5. Local PostgreSQL 18.3 Empirical Test Results

All failure-injection and identity preservation tests were executed against a disposable local PostgreSQL 18.3 database (`127.0.0.1:5433`).

### 5.1 Recovery Runbook Integration Suite (`backend/tests/integration/phase9b_recovery_runbook.integration.test.ts`)
```
 RUN  v4.1.11 C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend

 ✓ tests/integration/phase9b_recovery_runbook.integration.test.ts (7 tests) 492ms
   ✓ Scenario 1: Rolls back cleanly when zero modern rows exist; preserves 13 legacy rows
   ✓ Scenario 2: Correctly archives both mapped and unmapped modern rows while excluding legacy rows; preserves full UUID identity associations
   ✓ Scenario 3: Prevents silent overwrite when archive table already exists; fails closed with explicit error
   ✓ Scenario 4: Ensures transaction rollback restores previous state if failure occurs partway through rollback
   ✓ Scenario 5: Dynamic setval guarantees next ID is strictly greater than all surviving rows (no PK collision)
   ✓ Scenario 6: Allows clean retry of rollback after previous aborted attempt
   ✓ Scenario 7: Fails closed when archive validation assertion detects discrepancy; prevents compatibility column drop
```

### 5.2 Scenario Deep Dive Verification

1. **Scenario 2 (Identity Preservation & Forensic Verification)**:
   - Inserted modern row for Mapped User 148 (`profile_id = 'b96c0b60...'`, `amount_ml = 600`). Trigger set `user_id = 148`.
   - Inserted modern row for Mapped User 151 (`profile_id = '2dbbad1d...'`, `amount_ml = 400`). Trigger set `user_id = 151`.
   - Inserted modern row for Unmapped Net-New User (`profile_id = '2d27bc46...'`, `amount_ml = 850`). Trigger left `user_id = NULL`.
   - Total rows in `water_logs`: 16 (13 legacy + 3 modern).
   - Executed rollback with hardened query `WHERE profile_id IS NOT NULL OR user_id IS NULL`.
   - **Assertion Results**:
     - Exactly 3 rows archived (`arch_count = 3`, `src_count = 3`).
     - Row 148 archived with `profile_id = 'b96c0b60...'`, `user_id = 148`, classification `'modern_mapped'`. **UUID ownership preserved.**
     - Row 151 archived with `profile_id = '2dbbad1d...'`, `user_id = 151`, classification `'modern_mapped'`. **UUID ownership preserved.**
     - Net-new row archived with `profile_id = '2d27bc46...'`, `user_id = NULL`, classification `'modern_unmapped'`. **UUID ownership preserved.**
     - Historical legacy records (Users 153 and 147) strictly remained in `public.water_logs` and were **never included in the archive** (`u153InArch.length === 0`).
     - Authenticated role blocked from accessing archive (`permission denied for table _rollback_v2_water_logs_archive_test`).
     - Next sequence value generated was 17 (strictly greater than MAX(id) 16).

2. **Scenario 7 (Validation Failure & Fail-Closed Gate)**:
   - Inserted 2 modern rows (1 unmapped, 1 mapped).
   - Simulating an incomplete archive query (e.g. only `WHERE user_id IS NULL`, which only grabs 1 of the 2 rows).
   - The assertion gate evaluated `v_src (2) != v_arch (1)` and raised:
     `ERROR: Archive validation failed: source modern records (2) != archived records (1). Aborting rollback to prevent data loss!`
   - PostgreSQL transaction aborted immediately.
   - Post-abort checks verified:
     - `profile_id` column was NOT dropped.
     - Both modern rows remained intact with their UUID `profile_id` untouched.

---

## 6. Complete System Test Run Verification

The entire repository test suite was executed against the local environment:
- **Total Test Files**: 38 files (37 passed, 1 intentionally skipped for manual isolation)
- **Total Tests**: 611 tests (602 passed, 9 skipped)
- **Phase 9B Security Tests**: 26 / 26 passed (`phase9b_identity_bridge.security.test.ts`)
- **Phase 9B Integration Tests**: 7 / 7 passed (`phase9b_recovery_runbook.integration.test.ts`)
- **Duration**: 17.31s

---

## 7. Remaining Limitations & Boundaries

1. **Provenance Field Dependency**: The distinction between modern and historical legacy rows relies on `profile_id IS NOT NULL OR user_id IS NULL`. While mathematically exhaustive for the current schema (since historical legacy records always have `profile_id IS NULL` and `user_id IS NOT NULL`), if a rogue client were to directly write a row with both `profile_id IS NULL` and `user_id IS NULL`, that row would be archived. However, `sync_water_logs_compatibility()` rejects null volume rows, and `user_id IS NULL` without `profile_id` is a modern orphan by definition.
2. **Platform PITR Verification**: Supabase PITR is enabled on project `ymrblyiwohvxptiqjfsi`, but live cluster rewind drills were not executed to avoid interrupting staging operations.
3. **DB-4 Reconciliation Responsibility**: The archive table preserves the data, but restoring it permanently requires DB-4 to execute the reconciliation queries outlined in Section 4.

---

## 8. Final Recommendation & Authorization Gate

### **`GO FOR SEPARATE PHASE 9B STAGING AUTHORIZATION`**

The Phase 9B legacy identity bridge migration, recovery runbook, rollback archive completeness, sequence management, and security boundary have been comprehensively verified:
- **Zero data loss on rollback**: Both mapped (`148`, `151`) and unmapped modern UUID identities are 100% captured and preserved.
- **Legacy integrity preserved**: All 13 baseline hydration rows remain untouched in `public.water_logs`.
- **Fail-closed security**: Archive is protected by least privilege, and transaction aborts if validation detects any count discrepancy.

### Strict Execution Halt
- **Phase 9B remains UNAPPLIED on staging.**
- **No remote DDL/DML executed.**
- **DB-4 has NOT started.**
- **Stand by for explicit operator instructions.**
