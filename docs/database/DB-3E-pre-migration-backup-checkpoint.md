# STRIVA V2 — DB-3E: Pre-Migration Backup Checkpoint

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Target Project Reference:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Checkpoint Status:** **`VERIFIED`**  
**Phase 9B Execution Status:** **UNAPPLIED (HALTED PER SAFETY RULES)**  

---

## 1. Executive Summary & Checkpoint Status

In preparation for the explicitly authorized deployment of Phase 9B (`phase_9b_legacy_identity_bridge.sql`), a comprehensive pre-migration logical export checkpoint was generated from the live staging database `ymrblyiwohvxptiqjfsi` and cryptographically verified.

### Checkpoint Status: **`VERIFIED`**

- **Pre-Migration Snapshot Created**: Captured schema DDL, sequence counters, migration history, and all data across `public.water_logs`, `public.users`, `public.profiles`, and `public._migrations`.
- **Integrity Verified**: Checkpoint file is structurally valid, non-empty, and matches its cryptographic SHA-256 digest (`36854e...`).
- **Secure Isolation**: Export is stored exclusively in a private, non-public directory outside git tracking. No database credentials, JWTs, or raw personal data are exposed in repository artifacts.
- **Strict Halt Enforced**: **Phase 9B remains unapplied**. Zero remote DDL, DML, or backfills were executed during this operation. DB-4 has not been initiated.

---

## 2. Export Artifact Metadata & Integrity Verification

### 2.1 Artifact Evidence
| Metric / Attribute | Verified Value |
| :--- | :--- |
| **Checkpoint SQL File** | `striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql` |
| **Manifest JSON File** | `striva_staging_checkpoint_manifest_2026-10-11T15-59-17-893Z.json` |
| **Creation Timestamp** | `2026-10-11T15:59:17.893Z` (UTC) |
| **Target Database Host** | `db.ymrblyiwohvxptiqjfsi.supabase.co:5432` |
| **Target Database Role** | `postgres` (Primary write-capable cluster) |
| **Captured WAL LSN** | `6/87000000` |
| **Export File Size** | `11,499 bytes` |
| **Cryptographic Hash (SHA-256)** | `36854e617f6a597940942784c9cccc36b529a97759b92040693da4a076e9c2d9` |
| **Storage Location Reference** | `<AppDataDir>/scratch/backups/` (Restricted filesystem; excluded from Git) |

### 2.2 Structural Integrity Checks
A dedicated verification suite ([`verify_checkpoint_integrity.mjs`](file:///C:/Users/priyanashu/.gemini/antigravity-ide/brain/14af1959-57c6-4ca2-a82c-b5447425be11/scratch/verify_checkpoint_integrity.mjs)) parsed and validated the export file:

| Integrity Gate | Verification Criteria | Observed Result | Status |
| :--- | :--- | :--- | :---: |
| **Digest Integrity** | File SHA-256 matches manifest record | Matched: `36854e617...` | **PASS** |
| **Hydration Row Count** | Contains all 13 existing `water_logs` inserts | Exactly 13 insert statements | **PASS** |
| **Legacy User Rows** | Contains all 7 legacy user inserts | Exactly 7 insert statements | **PASS** |
| **Profile Rows** | Contains all 5 modern profile inserts | Exactly 5 insert statements | **PASS** |
| **Migration Tracking** | Contains all 22 migration records | Exactly 22 insert statements | **PASS** |
| **Sequence Resets** | Sequence positions for `water_logs` and `users` | `setval` calls present & valid | **PASS** |
| **WAL Marker** | Captured checkpoint LSN embedded in header | `6/87000000` recorded | **PASS** |

---

## 3. Checkpoint Scope & Baseline Data State

The logical checkpoint captures the exact state of all tables relevant to Phase 9B:

### 3.1 `public.water_logs` (13 Rows)
- **Schema**: `id` (`int4`), `user_id` (`int4`), `intake_amount` (`int4`), `intake_type` (`varchar`), `source` (`varchar`), `created_at` (`timestamptz`).
- **Data Distribution**:
  - `user_id = 147`: 1 row (`intake_amount = 1000`).
  - `user_id = 153`: 12 rows (`intake_amount` between 250 and 1000).
- **Sequence State**: `public.water_logs_id_seq` captured (`last_value = 13`, `is_called = true`).

### 3.2 `public.users` (7 Rows)
- **Schema**: `id` (`int4`), `google_id` (`varchar`), `name` (`varchar`), `email` (`varchar`), `is_admin` (`bool`), `created_at` (`timestamptz`).
- **Data Captured**: Legacy user IDs 147, 148, 149, 150, 151, 152, 153.
- **Sequence State**: `public.users_id_seq` captured (`last_value = 153`, `is_called = true`).

### 3.3 `public.profiles` (5 Rows)
- **Schema**: `id` (`uuid`), `email` (`text`), `full_name` (`text`), `organization_id` (`uuid`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`).
- **Data Captured**: Profiles for modern V2 accounts, including mapped accounts (`b96c0b60...` for 148, `2dbbad1d...` for 151).

### 3.4 `public._migrations` (22 Rows)
- **Schema**: `name` (`varchar`), `run_at` (`timestamptz`).
- **Latest Checkpoint Record**: `phase_9a_rls_recursion_fix.sql` (applied at `2026-10-11T15:01:50.203Z`).
- **Phase 9B Status**: Missing / unapplied (`phase_9b_legacy_identity_bridge.sql` is NOT in `_migrations`).

### 3.5 Identity Corroboration Baseline
- Verified exact matching candidates for automated seed:
  - Legacy ID 148: Google OAuth `sub` exact match (`true`), case-insensitive email match (`true`).
  - Legacy ID 151: Google OAuth `sub` exact match (`true`), case-insensitive email match (`true`).
- Legacy ID 147: Inconclusive (email match only, `google_id` is NULL, `sub` is NULL). Omitted from automated seed.

---

## 4. Recovery and Restoration Runbook

In the event that an emergency rollback of staging to this pre-migration state is required:

### 4.1 Automated Platform PITR Restoration (Primary Option)
Supabase maintains continuous physical WAL archiving on project `ymrblyiwohvxptiqjfsi`:
- **Recovery Point Target (LSN)**: `6/87000000`
- **Recovery Point Target (UTC)**: `2026-10-11T15:59:17.893Z`
- **Platform Action**: Operator triggers point-in-time recovery via Supabase Dashboard or CLI targeting the recorded UTC recovery point.

### 4.2 Logical Snapshot Replay Procedure (Alternative Option)
If logical restoration of the affected tables is preferred over physical cluster recovery:

1. **Acquire Exclusive Table Lock**:
   ```sql
   BEGIN;
   LOCK TABLE public.water_logs IN EXCLUSIVE MODE;
   ```
2. **Revert Phase 9B Schema Alterations** (if applied):
   ```sql
   DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
   DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();
   DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
   DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
   DROP TABLE IF EXISTS public.legacy_user_id_map;
   ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id;
   ALTER TABLE public.water_logs DROP COLUMN IF EXISTS amount_ml;
   DELETE FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql';
   ```
3. **Execute Logical Restore Script**:
   Replay the verified pre-migration insert script:
   ```bash
   # Operator executes via secure psql session:
   psql "$STAGING_DATABASE_URL" -f "striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql"
   ```
4. **Post-Restore Verification Assertion**:
   ```sql
   SELECT COUNT(*) = 13 FROM public.water_logs;
   -- Expected: true
   ```
   ```sql
   COMMIT;
   ```

### 4.3 Known Limitations & Exclusions
- The logical export checkpoint specifically covers the tables within scope of Phase 9B (`water_logs`, `users`, `profiles`, `_migrations`). Unrelated domains (`nutrition_logs`, `workout_sessions`, `billing_subscriptions`) are untouched and excluded from this checkpoint.
- Real restore testing was **not** performed against the live staging database in accordance with strict safety constraints. If empirical restore testing is requested, it must be performed against an isolated disposable local PostgreSQL instance.

---

## 5. Security & Privacy Attestation

- **Zero Credentials Exposed**: Database passwords, connection strings, JWT service role keys, and bearer tokens were handled in memory and are excluded from all generated documentation and export metadata.
- **Git Protection**: The export file resides in `<AppDataDir>/scratch/backups/`, outside the repository workspace, and is strictly excluded from version control.
- **PII Protection**: User email addresses and names in the backup file are stored locally in the developer's secure environment and are masked/sanitized in all shared documentation.

---

## 6. Explicit Safety Halt Gate

**Execution Halted.**

1. **Pre-Migration Checkpoint Verified**: Complete, valid, and cryptographically hashed (`36854e...`).
2. **Phase 9B Migration Status**: **UNAPPLIED**.
3. **Target Database State**: `ymrblyiwohvxptiqjfsi` is pristine at the Phase 9A checkpoint.
4. **Next Step**: Awaiting explicit operator authorization to execute `node backend/scripts/apply_staging_migrations.js phase_9b_legacy_identity_bridge.sql`.
