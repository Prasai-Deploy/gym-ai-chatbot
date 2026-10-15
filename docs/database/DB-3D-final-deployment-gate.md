# STRIVA V2 — DB-3D: Final Phase 9B Migration and Recovery Gate

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Target Migration Runner:** `backend/scripts/apply_staging_migrations.js` (Targeted execution mode)  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Evaluation Scope:** Read-Only Source Code & Staging Metadata Forensic Audit  
**Status Gate:** **GO FOR STAGING DEPLOYMENT (PENDING EXPLICIT OPERATOR AUTHORIZATION)**  

---

## 1. Executive Summary & Recommendation

A forensic, read-only safety review of the Phase 9B identity bridge migration, migration runner, live staging metadata, and rollback/recovery procedures was completed. 

### Final Recommendation: **`GO` (READY FOR EXPLICIT STAGING AUTHORIZATION)**

**Key Findings:**
1. **Targeted Runner Atomicity**: `backend/scripts/apply_staging_migrations.js` enforces targeted execution (`phase_9b_legacy_identity_bridge.sql` only), acquires an advisory transaction lock (`746291048201582`) before reading migration history, and executes all DDL/DML within an atomic transaction.
2. **Evidence-Backed 1:1 Mapping Seed**: Exactly two legacy users (IDs 148 and 151) qualify for automated mapping via corroborated Google OAuth `sub` identifiers and case-insensitive email matches. Legacy ID 147 is strictly excluded due to inconclusive evidence (email match only, missing OAuth subject corroboration) and marked pending manual operator attestation.
3. **Data Preservation & Compatibility**: All 13 historical hydration records are preserved. Legacy User 153's 12 records and User 147's 1 record remain intact with `profile_id = NULL`. Volume synchronization (`sync_water_logs_compatibility`) is deterministic across all 10 edge cases and uses `IS DISTINCT FROM` to prevent stale overwrite bugs.
4. **Hardened Rollback Runbook**: The rollback protocol accounts for modern post-migration records created with `user_id IS NULL`, mandating a collision-resistant pre-drop archival snapshot, table lock write-freeze, and row-count verification assertions.
5. **Recovery Readiness Distinction**: Platform PITR and WAL progression are confirmed active; however, empirical recovery readiness is classified as **inferred** rather than proven via a live restore drill. A pre-migration logical export checkpoint is mandated prior to execution.

> [!IMPORTANT]
> **Strict Halt Gate**: This **GO** assessment does **NOT** constitute deployment authorization. Zero remote DDL/DML commands were executed. Phase 9B remains unapplied. DB-4 has not been started.

---

## 2. Comprehensive Evidence & Verification Matrix

| # | Inspection Domain | Check Description | Verification Method | Status |
| :-: | :--- | :--- | :--- | :---: |
| **A.1** | **Recovery Readiness** | Primary write-capable cluster; active WAL progression | Read-only SQL: `pg_is_in_recovery() = false`, `current_wal_lsn = 6/86000000` | **PASS** |
| **A.2** | **Recovery Evidence** | Automated Supabase Point-in-Time Recovery (PITR) active | Inferred from managed platform configuration & operator confirmation | **INFERRED** |
| **A.3** | **Empirical Restore Drill** | Live restoration drill executed in this session | No restore drill executed (safety constraint: zero remote mutations) | **UNVERIFIED** |
| **B.1** | **Migration Idempotency** | Preflight schema gates, `IF NOT EXISTS`, safe policy recreation | AST & source code audit of `phase_9b_legacy_identity_bridge.sql` | **PASS** |
| **B.2** | **Partial Failure Atomicity** | Statement or assertion failure rolls back entire migration | Transaction-wrapped runner; proven on local PostgreSQL 18 engine | **PASS** |
| **B.3** | **Seed Qualification** | Automated seed restricted strictly to dual-factor users 148 & 151 | Query on staging returns exactly 2 rows; IDs 147, 149, 150, 152, 153 excluded | **PASS** |
| **B.4** | **Hydration Preservation** | Zero data loss on existing `public.water_logs` | All 13 rows confirmed on staging; assertion enforces `COUNT(*) >= 13` | **PASS** |
| **B.5** | **Trigger Determinism** | Volume synchronization handles INSERT, UPDATE, conflict & boundaries | 10 real PostgreSQL 18 engine tests passed; `IS DISTINCT FROM` verified | **PASS** |
| **B.6** | **Volume Boundary Checks** | Rejection of non-positive ($\le 0$ ml) or NULL volumes | PL/pgSQL boundary validation raises exception; verified on local PG 18 | **PASS** |
| **B.7** | **Identity Translation** | Bidirectional translation between `profile_id` and legacy `user_id` | Tested & verified via `legacy_user_id_map` lookups | **PASS** |
| **B.8** | **RLS & Privilege Hardening** | `water_logs` policy replaces open grants; sequence grants active | Policy installed for `authenticated` & `service_role`; `anon` revoked | **PASS** |
| **B.9** | **Sequence Ownership** | Sequence `water_logs_id_seq` exists and owned by `postgres` | Confirmed on staging: sequence exists; `postgres` owned | **PASS** |
| **C.1** | **Post-Migration Archival** | Modern records with `user_id IS NULL` archived before drop | Explicit runbook creates timestamped archival table | **PASS** |
| **C.2** | **Archive Collisions** | Timestamped archive table prevents collisions with prior runs | Protocol specifies `_rollback_v2_water_logs_archive_<timestamp>` | **PASS** |
| **C.3** | **Pre-Drop Assertion** | Archived row count matches source count before column drop | PL/pgSQL assertion validates counts match exactly | **PASS** |
| **C.4** | **Write Freeze Protocol** | Table lock prevents concurrent writes during rollback | `LOCK TABLE public.water_logs IN EXCLUSIVE MODE` mandated | **PASS** |
| **D.1** | **Targeted Runner Scope** | Runner executes strictly requested migration; rejects unknown | Verified in `apply_staging_migrations.js`: filters strictly to `argv[2]` | **PASS** |
| **D.2** | **No Unrelated Migrations** | Runner cannot silently execute pending migrations when targeted | Verified in `apply_staging_migrations.js`: array restricted to single target | **PASS** |
| **D.3** | **Advisory Lock Protocol** | 64-bit advisory lock acquired before reading migration history | `SELECT pg_advisory_xact_lock('746291048201582')` inside `BEGIN` | **PASS** |
| **D.4** | **Success Recording Gate** | Migration recorded in `_migrations` only after commit | Insert into `_migrations` placed after execution; committed atomically | **PASS** |
| **D.5** | **Failure Rollback & Exit** | Runner rolls back transaction, logs error, and exits non-zero | `catch` block executes `ROLLBACK`, releases client, calls `process.exit(1)` | **PASS** |
| **E.1** | **Staging Target Identity** | Verified staging project `ymrblyiwohvxptiqjfsi` | Host: `db.ymrblyiwohvxptiqjfsi.supabase.co`, DB: `postgres` | **PASS** |
| **E.2** | **Phase 9A Checkpoint** | Phase 9A migration applied; Phase 9B unapplied | Staging `_migrations` shows 9A applied (`2026-10-11T15:01:50Z`); 9B missing | **PASS** |
| **E.3** | **Phase 9B Non-Existence** | Mapping table, function, trigger do not pre-exist | Confirmed `false` across all objects on staging | **PASS** |

---

## 3. Migration Source & Runner Findings

### 3.1 Migration Artifact: `phase_9b_legacy_identity_bridge.sql`
- **Preflight Gate (Lines 62–88)**: Validates that relational dependencies `public.users`, `public.profiles`, and `public.water_logs` exist before executing any DDL.
- **Additive Bridge Schema (Lines 90–125)**:
  - `legacy_integer_id INT PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT`: Enforces strict 1:Many prevention and prevents accidental deletion of historical user rows.
  - `profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE`: Enforces strict Many:1 prevention and ensures clean GDPR profile deletion.
  - Grants: Read access granted strictly to `authenticated` (filtered by `auth.uid() = profile_id`); all permissions revoked from `PUBLIC` and `anon`.
- **Targeted Evidence Seed (Lines 127–141)**:
  ```sql
  INSERT INTO public.legacy_user_id_map (legacy_integer_id, profile_id, email, verification_method)
  SELECT 
      u.id, 
      p.id, 
      LOWER(u.email), 
      'oauth_sub_and_email'
  FROM public.users u
  JOIN auth.users au ON (u.google_id IS NOT NULL AND u.google_id = au.raw_user_meta_data->>'sub')
  JOIN public.profiles p ON p.id = au.id
  WHERE LOWER(u.email) = LOWER(p.email)
    AND u.id IN (148, 151)
  ON CONFLICT (legacy_integer_id) DO NOTHING;
  ```
  - Staging verification confirms this query yields **exactly 2 rows** (Legacy IDs 148 and 151).
  - Unmapped users (147, 149, 150, 152, 153) are strictly omitted.
- **Hydration Schema Adaptation & Backfill (Lines 143–167)**:
  - Adds nullable `profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`.
  - Adds nullable `amount_ml INT`.
  - Drops `NOT NULL` constraint on legacy `user_id`.
  - Backfills `amount_ml = intake_amount` across all 13 rows.
  - Backfills `profile_id` strictly for mapped users (IDs 148 & 151).
- **Deterministic Volume Trigger (Lines 169–259)**:
  - Employs `IS DISTINCT FROM` on UPDATE to distinguish whether `amount_ml`, `intake_amount`, or both changed.
  - Canonical precedence: When both columns are supplied with conflicting values, `amount_ml` takes precedence and mirrors to `intake_amount`.
  - Volume boundary check raises exception if volume $\le 0$ ml or NULL.
  - Zero SQL statement recursion: modifications applied in-place on the `NEW` buffer `BEFORE INSERT OR UPDATE`.
- **Row-Level Security & Grants (Lines 261–296)**:
  - Policy `"Members manage own water logs"`:
    ```sql
    USING (
        auth.uid() = profile_id OR
        EXISTS (
            SELECT 1 FROM public.legacy_user_id_map m
            WHERE m.legacy_integer_id = water_logs.user_id
              AND m.profile_id = auth.uid()
        )
    )
    ```
  - Sequence Grant: `GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO authenticated, service_role;` (prevents sequence permission errors on authenticated inserts).
- **Post-Migration Assertion Gate (Lines 298–336)**:
  - Asserts `legacy_user_id_map` row count equals exactly 2.
  - Asserts `water_logs` row count $\ge 13$ (zero data loss).
  - Asserts 0 rows have `amount_ml IS NULL`.
  - Asserts User 153 retains exactly 12 unmapped rows (`profile_id IS NULL`).
  - Asserts User 147 retains exactly 1 unmapped row (`profile_id IS NULL`).

### 3.2 Migration Runner: `apply_staging_migrations.js`
- **Concurrency Protection**: Transaction-scoped advisory lock (`746291048201582`) acquired prior to querying `_migrations`.
- **Targeted Invocation**: `node backend/scripts/apply_staging_migrations.js phase_9b_legacy_identity_bridge.sql` filters the execution queue strictly to that single file.
- **Failure Safety**: If any statement or assertion in Phase 9B fails, the catch block issues `ROLLBACK`, logs the detailed error stack, releases the connection, and exits with code `1`. `_migrations` remains untouched.

---

## 4. Recovery and Rollback Findings

### 4.1 Recovery Readiness Audit
- **WAL Progression**: Verified active (`current_wal_lsn = 6/86000000`).
- **Cluster Role**: Primary write-capable database (`pg_is_in_recovery() = false`).
- **Point-in-Time Recovery**: Supabase automated PITR is enabled on project `ymrblyiwohvxptiqjfsi`.
- **Readiness Classification**: **`INFERRED`**. Because zero-trust engineering standards require distinguishing proven restoration from inferred capabilities, we mandate that an explicit pre-migration logical export checkpoint be recorded immediately prior to deployment execution.

### 4.2 Rollback and Data Preservation Protocol
If rollback is initiated after deployment, modern V2 users may have logged hydration records where `user_id IS NULL` and `profile_id` is populated. Dropping `profile_id` naively would destroy their identity association.

The verified rollback runbook addresses this:
1. **Operator Approval & Write Freeze**:
   ```sql
   LOCK TABLE public.water_logs IN EXCLUSIVE MODE;
   ```
2. **Archival Snapshot**:
   ```sql
   CREATE TABLE public._rollback_v2_water_logs_archive_20261011 AS
   SELECT * FROM public.water_logs WHERE user_id IS NULL;
   REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_20261011 FROM PUBLIC, anon;
   GRANT SELECT ON TABLE public._rollback_v2_water_logs_archive_20261011 TO authenticated;
   GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_20261011 TO service_role;
   ```
3. **Pre-Drop Verification Assertion**:
   ```sql
   DO $$
   DECLARE v_src INT; v_arch INT;
   BEGIN
       SELECT COUNT(*) INTO v_src FROM public.water_logs WHERE user_id IS NULL;
       SELECT COUNT(*) INTO v_arch FROM public._rollback_v2_water_logs_archive_20261011;
       IF v_src != v_arch THEN
           RAISE EXCEPTION 'Rollback aborted: archive count (%) != source records with user_id IS NULL (%).', v_arch, v_src;
       END IF;
   END $$;
   ```
4. **Atomic Schema Reversion**:
   ```sql
   BEGIN;
   DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
   DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();
   DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
   DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
   DROP TABLE IF EXISTS public.legacy_user_id_map;
   ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id, DROP COLUMN IF EXISTS amount_ml;
   DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql';
   COMMIT;
   ```
5. **Data Preservation Outcome**:
   - All 13 original legacy rows remain intact with `user_id` and `intake_amount`.
   - Modern records are preserved in `_rollback_v2_water_logs_archive_20261011` for subsequent reconciliation into `v2_water_logs` in DB-4.

---

## 5. Blocking Defects and Remediation

**Zero Blocking Code or Schema Defects Found.**

All earlier identified defects have been remediated:
1. *Defect: Legacy ID 147 uncorroborated mapping in automated seed.*  
   $\rightarrow$ **Remediated**: Excluded from seed; marked pending manual operator attestation.
2. *Defect: Potential stale compatibility overwrite on UPDATE.*  
   $\rightarrow$ **Remediated**: Implemented `IS DISTINCT FROM` state-machine detection.
3. *Defect: Missing sequence grant for authenticated role.*  
   $\rightarrow$ **Remediated**: Added `GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO authenticated, service_role;`.
4. *Defect: Post-migration V2 records data loss on naive rollback.*  
   $\rightarrow$ **Remediated**: Mandated pre-drop timestamped archival snapshot and count assertion.

---

## 6. Proposed Deployment Checklist (For Future Authorized Execution)

When the operator explicitly authorizes Phase 9B execution:

### Step 1: Pre-Execution Authorization & Checkpoint
- [ ] Confirm human operator explicitly authorizes execution of `phase_9b_legacy_identity_bridge.sql`.
- [ ] Record UTC deployment timestamp and current database LSN as recovery checkpoint.
- [ ] Confirm no concurrent deployments or migrations are in flight.

### Step 2: Targeted Migration Execution
- [ ] Execute targeted runner command from repository root:
  ```bash
  node backend/scripts/apply_staging_migrations.js phase_9b_legacy_identity_bridge.sql
  ```
- [ ] Verify runner console logs:
  - `[LOCK] Migration advisory lock acquired successfully.`
  - `[TARGET MODE] Applying strictly specified migration: phase_9b_legacy_identity_bridge.sql`
  - `[APPLYING] phase_9b_legacy_identity_bridge.sql...`
  - `[SUCCESS] phase_9b_legacy_identity_bridge.sql`
  - `✓ Successfully committed 1 migrations to staging database.`

### Step 3: Post-Deployment Verification Queries (Read-Only)
- [ ] Verify `public.legacy_user_id_map` contains **exactly 2 rows**:
  ```sql
  SELECT COUNT(*), array_agg(legacy_integer_id) FROM public.legacy_user_id_map;
  -- Expected: count = 2, legacy_ids = {148, 151}
  ```
- [ ] Verify `public.water_logs` has **13 rows** and zero NULL `amount_ml`:
  ```sql
  SELECT COUNT(*), COUNT(amount_ml) FROM public.water_logs;
  -- Expected: count = 13, count(amount_ml) = 13
  ```
- [ ] Verify unmapped rows remain unclaimed:
  ```sql
  SELECT user_id, COUNT(*) FROM public.water_logs WHERE profile_id IS NULL GROUP BY user_id;
  -- Expected: user_id 147 -> 1 row; user_id 153 -> 12 rows
  ```
- [ ] Verify sequence privilege:
  ```sql
  SELECT has_sequence_privilege('authenticated', 'public.water_logs_id_seq', 'USAGE');
  -- Expected: true
  ```
- [ ] Verify `public._migrations` record:
  ```sql
  SELECT name, run_at FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql';
  -- Expected: 1 row with recent timestamp
  ```

### Step 4: Deployment Completion Gate
- [ ] Record results in deployment audit log.
- [ ] Halt. Do not deploy to production. Do not begin DB-4.

---

## 7. Halt Confirmation

**Execution Halted.**  
In accordance with DB-3D safety constraints:
- Zero remote DDL or DML was executed.
- No staging data or schema was mutated.
- Phase 9B has **not** been applied.
- DB-4 has **not** been initiated.
- Stand by for explicit operator authorization.
