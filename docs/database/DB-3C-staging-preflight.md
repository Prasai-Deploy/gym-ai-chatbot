# STRIVA V2 — DB-3C: Phase 9B Read-Only Staging Preflight

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration Filename:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Migration Runner:** `backend/scripts/apply_staging_migrations.js` (Targeted execution mode)  
**Target Project Reference:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Preflight Mode:** Read-Only Non-Mutating Metadata Queries  
**Final Status Gate:** **`READY FOR EXPLICIT PHASE 9B STAGING AUTHORIZATION`**  

---

## 1. Safety Boundary & Preflight Protocol

In strict compliance with STRIVA V2 engineering rules and safety restrictions:
- **Preflight Inspection Only**: Zero remote DDL, DML, backfills, or schema mutations were executed against the remote staging environment.
- **Zero Modifications**: No live data, existing policies, or sequence states were altered.
- **No Secrets or PII Exposed**: Raw user emails, OAuth `sub` tokens, passwords, and JWT credentials are masked and sanitized; only boolean matches and row counts are presented.
- **Strict Project Identity Binding**: Remote queries were gated to verify the target host contains `ymrblyiwohvxptiqjfsi` prior to opening connections.
- **Non-Execution Gate**: Phase 9B deployment has **not** been applied; DB-4 has **not** been initiated.

---

## 2. Review of the Exact Deployment Artifacts

### 2.1 Artifact Inventory & Integrity
The following repository artifacts were reviewed and verified:
1. [`backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql): Canonical additive identity bridge schema and hydration dual-key adaptation.
2. [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js): Transaction-wrapped, advisory-locked staging migration runner.
3. [`backend/tests/integration/phase9b_real_postgres.integration.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/integration/phase9b_real_postgres.integration.test.ts): 20 real PostgreSQL 18 engine integration tests (100% pass).
4. [`backend/tests/security/phase9b_identity_bridge.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase9b_identity_bridge.security.test.ts): 26 AST, contract, and RLS security tests (100% pass).
5. [`docs/database/DB-3B-identity-bridge-security-review.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-3B-identity-bridge-security-review.md): Hardened security architecture and evidence audit review.
6. [`docs/database/DB-3B-identity-bridge-test-results.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-3B-identity-bridge-test-results.md): Complete test results and verification logs.

### 2.2 Migration Runner Concurrency & Targeted Mode Verification
Inspection of [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) confirms:
- **Targeted Execution Guarantee**: The runner supports targeted invocation via CLI argument:
  ```bash
  node backend/scripts/apply_staging_migrations.js phase_9b_legacy_identity_bridge.sql
  ```
  When `process.argv[2]` is provided, `migrationsToProcess` strictly filters the migration queue to the single specified file:
  ```javascript
  const targetFile = process.argv[2];
  const migrationsToProcess = targetFile
    ? migrations.filter(m => m === targetFile)
    : migrations;
  if (targetFile && migrationsToProcess.length === 0) {
    throw new Error(`Target migration "${targetFile}" is not registered in runner migration list.`);
  }
  ```
  Unrelated pending migrations cannot execute in targeted mode.
- **Transaction-Scoped Advisory Lock**: Inside the explicit `BEGIN` transaction boundary, the runner acquires a 64-bit advisory lock:
  ```javascript
  await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_ADVISORY_LOCK_KEY]);
  ```
  Lock key `746291048201582` prevents race conditions from concurrent runners. The lock is automatically and synchronously released upon `COMMIT` or `ROLLBACK`.
- **Strict Commit Ordering**: The migration filename is inserted into `public._migrations` within the transaction only after all DDL statements, triggers, and the post-migration assertion block succeed.

---

## 3. Read-Only Staging Prerequisite Checks

All checks were executed via non-mutating SQL metadata inspection against `db.ymrblyiwohvxptiqjfsi.supabase.co`.

```
+-----------------------------------------------------------------------------------------+
|                               STAGING PREFLIGHT CHECK MATRIX                            |
|                                        10 / 10 PASS                                     |
+-----------------------------------------------------------------------------------------+
| Check 1: Target Database Host & Identity                          [ PASS ]              |
| Check 2: Table Existence, Types, Columns & Ownership              [ PASS ]              |
| Check 3: Foreign Key & Constraint Integrity                       [ PASS ]              |
| Check 4: Existing Water-Logs RLS Policies & Grants                [ PASS ]              |
| Check 5: Sequence Existence & Ownership (water_logs_id_seq)       [ PASS ]              |
| Check 6: Hydration Data Integrity & Volume Boundary Checks        [ PASS ]              |
| Check 7: Non-Existence of Phase 9B Objects                        [ PASS ]              |
| Check 8: Dual-Factor Evidence Verification for Migration Seed     [ PASS ]              |
| Check 9: Concurrency, In-Flight Activity & Advisory Lock State   [ PASS ]              |
| Check 10: Point-in-Time Recovery & WAL Status                     [ PASS ]              |
+-----------------------------------------------------------------------------------------+
```

---

### Check 1: Target Database Host & Identity
- **Evaluation Criteria**: Target host must match the authorized STRIVA V2 staging instance (`ymrblyiwohvxptiqjfsi`). Connected role must be `postgres`.
- **Query Executed**:
  ```sql
  SELECT current_database(), current_user, session_user, version();
  ```
- **Observed Findings**:
  - `current_database`: `postgres`
  - `current_user`: `postgres`
  - `session_user`: `postgres`
  - `version`: `PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, 64-bit`
  - `host`: `db.ymrblyiwohvxptiqjfsi.supabase.co`
- **Result**: **PASS**

---

### Check 2: Table Existence, Types, Columns & Ownership
- **Evaluation Criteria**: `public.users`, `public.profiles`, and `public.water_logs` must exist, match migration type assumptions, and be owned by `postgres`.
- **Observed Findings**:
  - `public.users`: Owned by `postgres`. Contains columns `id` (`int4`, PK), `google_id` (`varchar`), `name` (`varchar`), `email` (`varchar`, UNIQUE), `is_admin` (`bool`), `created_at` (`timestamptz`).
  - `public.profiles`: Owned by `postgres`. Contains columns `id` (`uuid`, PK), `email` (`text`), `full_name` (`text`), `organization_id` (`uuid`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`).
  - `public.water_logs`: Owned by `postgres`. Contains columns `id` (`int4`, PK), `user_id` (`int4`, NOT NULL), `intake_amount` (`int4`, NOT NULL), `intake_type` (`varchar`), `source` (`varchar`), `created_at` (`timestamptz`).
- **Result**: **PASS**

---

### Check 3: Foreign Key & Constraint Integrity
- **Evaluation Criteria**: Legacy foreign key on `water_logs.user_id` must reference `public.users(id)` with `ON DELETE CASCADE`.
- **Query Executed**:
  ```sql
  SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name, rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'water_logs';
  ```
- **Observed Findings**:
  - `constraint_name`: `water_logs_user_id_fkey`
  - `column_name`: `user_id` $\rightarrow$ `users(id)`
  - `delete_rule`: `CASCADE`
- **Result**: **PASS**

---

### Check 4: Existing Water-Logs RLS Policies & Grants
- **Evaluation Criteria**: Understand current RLS and grant state on `public.water_logs` to ensure Phase 9B policy installation and grant hardening succeed cleanly.
- **Observed Findings**:
  - `relrowsecurity`: `true` (Row Level Security is enabled).
  - `relforcerowsecurity`: `false`.
  - `pg_policies`: `[]` (Currently **0** policies exist on `public.water_logs`).
  - `role_table_grants`: Grants exist for `anon`, `authenticated`, `postgres`, and `service_role`.
  - **Analysis**: Because RLS is active with 0 policies, standard `authenticated` access is currently blocked. Phase 9B will install `"Members manage own water logs"` and `"Service role manages water logs"`, restoring legitimate member access while revoking permissions from `anon` (Fail-Closed).
- **Result**: **PASS**

---

### Check 5: Sequence Existence & Ownership (`water_logs_id_seq`)
- **Evaluation Criteria**: Sequence `public.water_logs_id_seq` must exist and be owned by `postgres` so Phase 9B can execute `GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO authenticated, service_role;`.
- **Query Executed**:
  ```sql
  SELECT sequence_name, data_type, start_value, maximum_value FROM information_schema.sequences WHERE sequence_name = 'water_logs_id_seq';
  SELECT relname, relowner::regrole::text AS owner FROM pg_class WHERE relname = 'water_logs_id_seq';
  ```
- **Observed Findings**:
  - `sequence_name`: `water_logs_id_seq` (`integer`, start 1, max 2147483647).
  - `owner`: `postgres`.
- **Result**: **PASS**

---

### Check 6: Hydration Data Integrity & Volume Boundary Checks
- **Evaluation Criteria**: Total hydration rows must equal exactly 13; no rows may have `intake_amount <= 0` or `intake_amount IS NULL`; user distribution must match audit baseline (1 for User 147, 12 for User 153); compatibility columns must not pre-exist.
- **Query Executed**:
  ```sql
  SELECT COUNT(*) FROM public.water_logs;
  SELECT COUNT(*) FROM public.water_logs WHERE intake_amount IS NULL OR intake_amount <= 0;
  SELECT user_id, COUNT(*), MIN(intake_amount), MAX(intake_amount) FROM public.water_logs GROUP BY user_id ORDER BY user_id;
  SELECT column_name FROM information_schema.columns WHERE table_name = 'water_logs' AND column_name IN ('amount_ml', 'profile_id');
  ```
- **Observed Findings**:
  - `total_rows`: `13` (Zero data loss).
  - `invalid_amounts`: `0` (100% of rows have strictly positive volume $\ge 250$ ml).
  - Breakdown by legacy `user_id`:
    - `user_id = 147`: `1` row (`intake_amount = 1000`).
    - `user_id = 153`: `12` rows (`min = 250`, `max = 1000`).
  - Pre-existing compatibility columns: `[]` (`amount_ml` and `profile_id` do not exist yet).
- **Result**: **PASS**

---

### Check 7: Non-Existence of Phase 9B Objects
- **Evaluation Criteria**: Verify that Phase 9B objects do not pre-exist in staging.
- **Observed Findings**:
  - `public.legacy_user_id_map`: Does NOT exist (`false`).
  - `public.sync_water_logs_compatibility()` function: Does NOT exist (`false`).
  - `trg_sync_water_logs_compatibility` trigger: Does NOT exist (`false`).
  - `_migrations` table check: `phase_9b_legacy_identity_bridge.sql` is NOT recorded (`false`).
- **Result**: **PASS**

---

### Check 8: Dual-Factor Evidence Verification for Migration Seed
- **Evaluation Criteria**: Confirm that the exact seed query in Phase 9B produces **exactly 2 rows** (Legacy IDs 148 and 151) and strictly omits inconclusive users (147, 149, 150, 152, 153).
- **Query Executed**:
  ```sql
  SELECT u.id AS legacy_id, (p.id IS NOT NULL) AS has_profile_id
  FROM public.users u
  JOIN auth.users au ON (u.google_id IS NOT NULL AND u.google_id = au.raw_user_meta_data->>'sub')
  JOIN public.profiles p ON p.id = au.id
  WHERE LOWER(u.email) = LOWER(p.email)
    AND u.id IN (148, 151)
  ORDER BY u.id;
  ```
- **Observed Findings**:
  - Matching rows: **Exactly 2** (`legacy_id = 148`, `legacy_id = 151`).
  - Evidence for User 148: `google_id` matches OAuth `sub` (`true`), case-insensitive email matches (`true`).
  - Evidence for User 151: `google_id` matches OAuth `sub` (`true`), case-insensitive email matches (`true`).
  - Evidence for User 147: `google_id` is `NULL`, `sub` is `NULL`. Email match only. Inconclusive under dual-factor policy. Omitted from automated seed.
- **Result**: **PASS**

---

### Check 9: Concurrency, In-Flight Activity & Advisory Lock State
- **Evaluation Criteria**: No conflicting database queries touching hydration or migration state. No active advisory locks held. Migration history verified at Phase 9A checkpoint.
- **Observed Findings**:
  - Active conflicting transactions on `water_logs` or `_migrations`: `0`.
  - Active advisory locks in `pg_locks`: `[]`.
  - Latest applied migration in `_migrations`: `phase_9a_rls_recursion_fix.sql` (applied at `2026-10-11T15:01:50.203Z`).
- **Result**: **PASS**

---

### Check 10: Point-in-Time Recovery & WAL Status
- **Evaluation Criteria**: Staging instance is active, not in read-only standby recovery, and WAL progression is normal.
- **Observed Findings**:
  - `in_recovery`: `false` (Primary write-capable cluster).
  - `current_wal_lsn`: `6/86000000`.
  - Managed Supabase automated backups active on project `ymrblyiwohvxptiqjfsi`.
- **Result**: **PASS**

---

## 4. Hardened Rollback & Reconciliation Runbook Analysis

### 4.1 Post-Migration Data Preservation Invariant
If rollback is initiated after deployment, modern V2 users will have logged hydration records where `profile_id` is populated but `user_id IS NULL`. 

> [!CAUTION]
> A naive rollback executing `ALTER TABLE public.water_logs DROP COLUMN profile_id` would permanently orphan all post-migration records. The recovery procedure must archive these records prior to dropping compatibility columns.

### 4.2 Step-by-Step Rollback Runbook (Operator Reference)
In the event that Phase 9B must be rolled back:

1. **Write Freeze & Exclusive Lock**:
   Initiate during a scheduled maintenance window or acquire table lock:
   ```sql
   LOCK TABLE public.water_logs IN EXCLUSIVE MODE;
   ```
2. **Deterministic Archival Snapshot**:
   Create a collision-resistant timestamped archive table:
   ```sql
   CREATE TABLE IF NOT EXISTS public._rollback_v2_water_logs_archive_20261011 AS
   SELECT * FROM public.water_logs WHERE user_id IS NULL;
   ```
3. **Archive Privilege Hardening**:
   ```sql
   REVOKE ALL ON TABLE public._rollback_v2_water_logs_archive_20261011 FROM PUBLIC, anon;
   GRANT SELECT ON TABLE public._rollback_v2_water_logs_archive_20261011 TO authenticated;
   GRANT ALL ON TABLE public._rollback_v2_water_logs_archive_20261011 TO service_role;
   ```
4. **Pre-Drop Verification Assertion**:
   ```sql
   DO $$
   DECLARE
       v_src_count INT;
       v_arch_count INT;
   BEGIN
       SELECT COUNT(*) INTO v_src_count FROM public.water_logs WHERE user_id IS NULL;
       SELECT COUNT(*) INTO v_arch_count FROM public._rollback_v2_water_logs_archive_20261011;
       IF v_src_count != v_arch_count THEN
           RAISE EXCEPTION 'Rollback aborted: archive count (%) does not match source records with user_id IS NULL (%).', v_arch_count, v_src_count;
       END IF;
   END $$;
   ```
5. **Atomic Schema Reversion Transaction**:
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
6. **Post-Rollback Verification**:
   - All 13 original legacy rows remain intact with `user_id` and `intake_amount`.
   - Modern records are safely preserved in `_rollback_v2_water_logs_archive_20261011` for subsequent reconciliation into `v2_water_logs` in DB-4.

---

## 5. Unresolved Differences & Mitigations

| Area | Status | Mitigation Strategy |
| :--- | :---: | :--- |
| **Legacy User 147** | Omitted from seed | Retained unmapped pending manual operator attestation. Single hydration log intact. |
| **Legacy User 153** | Omitted from seed | Retained with `profile_id = NULL`. All 12 hydration logs intact pending runtime claim protocol. |
| **Sequence Permissions** | Addressed | Explicitly granted in Phase 9B: `GRANT USAGE, SELECT ON SEQUENCE water_logs_id_seq TO authenticated`. |
| **Concurrent Runners** | Prevented | Advisory lock key `746291048201582` active in `apply_staging_migrations.js`. |

---

## 6. Final Recommendation Gate

### **`READY FOR EXPLICIT PHASE 9B STAGING AUTHORIZATION`**

All 10 preflight verification gates have been inspected on live staging and passed. The migration artifact, runner, seed evidence, trigger semantics, sequence grants, and rollback protocols are completely verified.

**Next Action**: Stand by for explicit operator authorization before initiating deployment. Do not deploy Phase 9B or start DB-4.
