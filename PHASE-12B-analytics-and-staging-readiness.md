# STRIVA V2 — Phase 12B: Analytics Persistence Fix & Staging Readiness Report

**Document Version:** 1.0.0  
**Date / Local Time:** 2026-10-14 16:50 IST  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi` (Untouched — Verification Only)  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Remote Staging Baseline:** Exactly 26 migrations recorded in `public._migrations`  
**Local Test Environment:** Isolated restored disposable PostgreSQL 18.3 cluster on `127.0.0.1:5433` (`striva_restore_test`)  
**Remote DDL/DML Applied in this Phase:** Strictly 0 (Local preparation, testing, and preflight only)  
**Production Database Status:** Untouched & Protected (Zero connections or mutations)  
**Working Tree Status:** All 45 modified UI files in `src/` and untracked artifacts strictly preserved  
**Phase Verdict:** **PHASE 12B READY FOR STAGING DEPLOYMENT APPROVAL**

---

## 1. Executive Summary

During the Phase 12A routine hardening and TRINETRA chatbot audit, real inference and database conversation persistence succeeded, but a critical consumer analytics schema blocker was identified: `public.ai_usage_analytics.organization_id` was constrained as `NOT NULL REFERENCES organizations(id)`. Because direct consumer users lack an organization context, their AI usage telemetry could not be persisted without either violating database integrity or inventing fake organization UUIDs.

In **Phase 12B**, a clean, decoupled solution was designed, implemented, and empirically validated locally without touching remote staging:

1. **Dedicated Minimal Migration Authored:** `backend/supabase/migrations/phase_12b_consumer_analytics_persistence.sql` alters `organization_id` to `DROP NOT NULL`, adds a partial index `idx_ai_usage_analytics_consumer_user`, and introduces consumer-scoped Row Level Security (RLS) policies.
2. **Repository Contract Updated:** `AIUsageRepository.ts` now accepts consumer events (`organizationId: null`), preserves B2B attribution, avoids leaking prompts/secrets in error logs, and exposes `getUserUsage()` for personal telemetry.
3. **Independent Routine Migration Review:** `phase_12_legacy_routine_hardening.sql` (Phase 12A) was reviewed and validated for correct `SECURITY INVOKER` modes, pinned search paths (`pg_catalog, pg_temp`), and restricted grants.
4. **Disposable Database Integration (Port 5433):** Both migrations were applied sequentially. Tests verified consumer persistence with `organization_id = NULL`, B2B persistence, foreign key rejection of invalid org IDs (`23503`), tenant isolation, and transaction rollback.
5. **Full Test & Build Verification:**
   - Dedicated Phase 12B Security Suite: **13 of 13 tests passing (100%)**
   - Full Security Suite (36 test files): **587 of 587 tests passing (100%)**
   - Backend Unit Suite (7 test files): **84 of 84 tests passing (100%)**
   - Workspace Build (`npm run build`): Vite frontend + TypeScript backend compiled with **Exit Code 0**.
6. **Staging Preflight:** Staging runner `apply_staging_migrations.js` target guard verified, logical backup files verified readable, and sequential migration plan formulated.

---

## 2. Schema Root Cause & Migration Diff

### 2.1. Root Cause Analysis
In `009_ai_memory_and_usage.sql`, the `ai_usage_analytics` table was declared with:
```sql
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
```
While appropriate for multi-tenant B2B enterprise users (gym owners, staff, trainers), STRIVA V2 is a dual-market application serving both B2B gym organizations and direct B2C consumer fitness members. When a consumer uses the TRINETRA coach, `req.organizationContext` is undefined. Attempting to persist usage resulted in PostgreSQL error `23502 (not_null_violation)`, causing failed analytics inserts. Attempting to bypass this by assigning fallback UUIDs like `'00000000-0000-0000-0000-000000000001'` is strictly prohibited by STRIVA engineering rules.

### 2.2. Migration Specification (`phase_12b_consumer_analytics_persistence.sql`)
In PostgreSQL, foreign key constraints on nullable columns are only evaluated when the value is non-null. Therefore:
- Dropping `NOT NULL` on `organization_id` allows consumer records with `organization_id = NULL`.
- Foreign key integrity (`ai_usage_analytics_organization_id_fkey`) remains 100% enforced for non-NULL organization values.
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` remains non-null, guaranteeing every usage event is strictly attributed to an authenticated identity.

```sql
-- --------------------------------------------------------------------
-- 1. Alter Column Nullability
-- --------------------------------------------------------------------
ALTER TABLE public.ai_usage_analytics
    ALTER COLUMN organization_id DROP NOT NULL;

COMMENT ON COLUMN public.ai_usage_analytics.organization_id IS
'Organization UUID for B2B usage attribution; NULL for individual direct consumer usage.';

-- --------------------------------------------------------------------
-- 2. Consumer Performance Index
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_consumer_user
    ON public.ai_usage_analytics (user_id, created_at)
    WHERE organization_id IS NULL;

-- --------------------------------------------------------------------
-- 3. Row Level Security Policies for Consumer Records
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ai_usage_analytics'
          AND policyname = 'Users view own consumer AI usage analytics'
    ) THEN
        CREATE POLICY "Users view own consumer AI usage analytics"
            ON public.ai_usage_analytics FOR SELECT
            USING (
                auth.uid() = user_id
                AND organization_id IS NULL
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ai_usage_analytics'
          AND policyname = 'Users insert own consumer AI usage analytics'
    ) THEN
        CREATE POLICY "Users insert own consumer AI usage analytics"
            ON public.ai_usage_analytics FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
                AND organization_id IS NULL
            );
    END IF;
END;
$$;
```

---

## 3. Routine Migration Review Findings (Phase 12A)

An independent audit of `backend/supabase/migrations/phase_12_legacy_routine_hardening.sql` confirmed:

| Routine | Execution Mode | `search_path` | Object Qualification | Effective ACLs | Operational Verification |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `public.update_modified_column()` | `SECURITY INVOKER` | `pg_catalog, pg_temp` | `pg_catalog.now()` | `authenticated`, `service_role`, `postgres` (`anon`: REVOKED, `PUBLIC`: REVOKED) | Triggers on 11 active core V2 tables fire cleanly upon user updates. |
| `public.update_updated_at_column()` | `SECURITY INVOKER` | `pg_catalog, pg_temp` | `pg_catalog.now()` | `authenticated`, `service_role`, `postgres` (`anon`: REVOKED, `PUBLIC`: REVOKED) | Triggers on legacy tables fire cleanly without permission errors. |
| `public.update_membership_statuses()` | `SECURITY INVOKER` | `pg_catalog, pg_temp` | `public.memberships`, `public.user_workout_assignments`, `public.user_diet_assignments`, `public.membership_plans` | `postgres`, `service_role` (`anon`: REVOKED, `authenticated`: REVOKED, `PUBLIC`: REVOKED) | Direct RPC attack surface closed. Executed daily at 00:00 UTC by `pg_cron` as role `postgres`. |
| `public.is_admin()` | `SECURITY INVOKER` (`STABLE`) | `pg_catalog, pg_temp` | `public.admins` | `authenticated`, `service_role`, `postgres` (`anon`: REVOKED, `PUBLIC`: REVOKED) | Converted to `SECURITY INVOKER`. Evaluates caller identity via `auth.jwt() ->> 'email'`. |
| `public.get_admin_role()` | `SECURITY INVOKER` (`STABLE`) | `pg_catalog, pg_temp` | `public.admins` | `authenticated`, `service_role`, `postgres` (`anon`: REVOKED, `PUBLIC`: REVOKED) | Converted to `SECURITY INVOKER`. Pinned search path eliminates search-path injection. |

**Review Outcome:**
- **No Over-Privileged Execution:** All 5 routines strictly operate as `SECURITY INVOKER`.
- **Search Path Injection Sealed:** All 5 routines pin `SET search_path = pg_catalog, pg_temp`.
- **Cron Intact:** `update_membership_statuses()` retains required grants for `postgres` (pg_cron).
- **Triggers Intact:** Row-level triggers retain required grants for `authenticated`.
- **Decoupled:** Phase 12A remains strictly self-contained and does not bundle any schema changes.

---

## 4. Local Database Tests & Empirical Results (Port 5433)

Testing was conducted against the isolated restored database `striva_restore_test` on `127.0.0.1:5433`:

```
================================================================
STRIVA V2 - Phase 12A & 12B Local Migration Rehearsal & Testing
Target: Local restored disposable PostgreSQL (port 5433)
================================================================

[STEP 0] Baseline Verification
Initial _migrations count: 26
Initial ai_usage_analytics.organization_id is_nullable: NO

[STEP 1] Applying Phase 12A Routine Hardening Migration...
✓ Successfully applied phase_12_legacy_routine_hardening.sql
Current _migrations count: 27
Phase 12A Routine Properties:
 - get_admin_role(): secdef=false, config=["search_path=pg_catalog, pg_temp"]
 - is_admin(): secdef=false, config=["search_path=pg_catalog, pg_temp"]
 - update_membership_statuses(): secdef=false, config=["search_path=pg_catalog, pg_temp"]
 - update_modified_column(): secdef=false, config=["search_path=pg_catalog, pg_temp"]
 - update_updated_at_column(): secdef=false, config=["search_path=pg_catalog, pg_temp"]
✓ All 5 routines verified: SECURITY INVOKER with search_path=pg_catalog, pg_temp.

[STEP 2] Applying Phase 12B Consumer Analytics Migration...
✓ Successfully applied phase_12b_consumer_analytics_persistence.sql
Current _migrations count: 28
ai_usage_analytics.organization_id is_nullable: YES
Partial index created: true
 - Index definition: CREATE INDEX idx_ai_usage_analytics_consumer_user ON public.ai_usage_analytics USING btree (user_id, created_at) WHERE (organization_id IS NULL)
AI Usage Analytics RLS Policies:
 - "Tenant AI usage analytics insert policy" (INSERT)
 - "Tenant AI usage analytics select policy" (SELECT)
 - "Users insert own consumer AI usage analytics" (INSERT)
 - "Users view own consumer AI usage analytics" (SELECT)

[STEP 3] Testing Constraints, Foreign Keys & Persistence...
Using Test User A: b96c0b60-9a8b-496f-9e33-f533982412f6
Using Test User B: e17245f8-6248-4c48-b58f-f0dc6a17dda8
Using Test Organization: 00000000-0000-0000-0000-000000000001 (STRIVA Default Enterprise)
Test 3.1: Inserting consumer usage record with organization_id = NULL...
✓ Consumer usage record created with ID: eb933187-1018-4eea-944d-c6c4fff0e475, org: null
Test 3.2: Inserting B2B usage record with valid organization_id...
✓ B2B usage record created with ID: 8a66057d-9bba-4b44-beed-61c8dd951180, org: 00000000-0000-0000-0000-000000000001
Test 3.3: Verifying invalid organization_id is rejected by FK constraint...
✓ FK rejection caught successfully: code=23503 (insert or update on table "ai_usage_analytics" violates foreign key constraint "ai_usage_analytics_organization_id_fkey")
Test 3.4: Verifying user_id NOT NULL constraint...
✓ NOT NULL rejection caught successfully: code=23502

[STEP 4] Testing Query & Tenant Isolation Logic...
B2B query for org 00000000-0000-0000-0000-000000000001 returned 1 records.
✓ B2B query strictly isolates to organization_id, consumer records excluded.
Consumer query for user b96c0b60-9a8b-496f-9e33-f533982412f6 returned 1 records.
✓ Consumer query strictly isolates to user_id and organization_id IS NULL.

[STEP 5] Testing Re-run & Idempotence Behavior...
✓ Phase 12B migration executed cleanly a second time (idempotent DDL & policy definitions).

[STEP 6] Testing Transaction Rollback on Error...
✓ Transaction error caught and rolled back safely.
✓ Confirmed rollback left no trace in _migrations.

================================================================
ALL LOCAL DATABASE TESTS & ASSERTIONS PASSED WITH 100% SUCCESS!
================================================================
```

---

## 5. Security, Unit, Typecheck & Build Results

### 5.1. Automated Test Summary
| Test Suite | Command | Total Tests | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Phase 12B Security Suite** | `npm --workspace backend test -- tests/security/phase12b_analytics_persistence.security.test.ts` | 13 | 13 | 0 | **PASS** |
| **Phase 12A Security Suite** | `npm --workspace backend test -- tests/security/phase12a_routine_hardening.security.test.ts` | 10 | 10 | 0 | **PASS** |
| **Chatbot & API Security Suite** | `npm --workspace backend test -- tests/security/ai_chatbot_audit_remediation.security.test.ts` | 6 | 6 | 0 | **PASS** |
| **Complete Security Test Suite** | `npm --workspace backend test -- tests/security/` | 587 | 587 | 0 | **PASS** (36 test files) |
| **Backend Unit Test Suite** | `npm --workspace backend test -- tests/unit/` | 84 | 84 | 0 | **PASS** (7 test files) |

### 5.2. TypeScript & Build Checks
| Layer | Tool / Command | Result |
| :--- | :--- | :--- |
| **Backend TypeScript Compilation** | `npm --workspace backend run build` (`tsc && tsc-alias`) | **PASS** (0 errors, dist files generated) |
| **Frontend Production Bundle** | `npm run build:frontend` (`vite build`) | **PASS** (3,240 modules transformed, 21.97s) |
| **Full Workspace Build** | `npm run build` | **PASS** (Exit Code 0) |

---

## 6. Consumer and B2B Analytics Verification

### 6.1. Tenant Isolation & Query Boundary Matrix
| Dimension | Consumer AI Usage | B2B Organization AI Usage | Verification Result |
| :--- | :--- | :--- | :--- |
| **`organization_id` value** | `NULL` | Valid Organization UUID | Verified in DB |
| **Foreign Key Check** | Skipped by PostgreSQL (NULL) | Strictly enforced via `ai_usage_analytics_organization_id_fkey` | Invalid Org UUID throws `23503` |
| **User Identity** | `user_id NOT NULL REFERENCES auth.users(id)` | `user_id NOT NULL REFERENCES auth.users(id)` | NULL user throws `23502` |
| **B2B Queries** | `.eq('organization_id', orgId)` | Excludes all consumer events | Verified zero leakage |
| **Consumer Queries** | `.eq('user_id', userId).is('organization_id', null)` | Excludes all B2B events | Verified user-isolated |
| **RLS Policies** | `"Users view own consumer AI usage analytics"` | `"Tenant AI usage analytics select policy"` | Authenticated scope enforced |

### 6.2. Error Logging Sanitization
In `AIUsageRepository.ts`, error logging now records structured, non-sensitive diagnostic metadata:
```typescript
logger.error(
  {
    err: error.message,
    code: error.code,
    userId: analytics.userId,
    organizationId: resolvedOrgId,
    agentId: analytics.agentId,
    provider: analytics.provider,
    model: analytics.model,
  },
  '[AIUsageRepository] Failed to insert usage record'
);
```
Prompt contents, completions, authorization tokens, and raw message payloads are strictly excluded from logs.

---

## 7. Migration Order, Hashes, Baseline & Staging Preflight

### 7.1. Expected Migration Sequence
```
Remote Staging Current Baseline: 26 migrations (ends with phase_11_prelaunch_hardening.sql)
│
├── 27. phase_12_legacy_routine_hardening.sql
│       SHA-256: A53F714C7ADBCEBD81BF08DAA8C16557F073CD9A1C990F0324C314F07B9396DE
│       Scope: Routine hardening (5 routines, SECURITY INVOKER, search_path pinned)
│
└── 28. phase_12b_consumer_analytics_persistence.sql
        SHA-256: 008D7973C251F276A88FF04C26C76298A027B06E70FBAF09D2CF08AE40FE7703
        Scope: Schema fix (organization_id NULL, partial index, consumer RLS)
```

### 7.2. Canonical Staging Runner Inspection (`apply_staging_migrations.js`)
1. **Target Guard (`validateStagingDatabaseUrl`):**
   - Strictly enforces protocol `postgresql:` or `postgres:`.
   - Exact hostname equality check: `hostname === 'db.ymrblyiwohvxptiqjfsi.supabase.co'`.
   - Structural project reference check: `parts[1] === 'ymrblyiwohvxptiqjfsi'`.
   - **Fails closed before any database pool creation or network activity.**
2. **Advisory Lock Key:** Stable 64-bit bigint `746291048201582` acquired inside transaction (`pg_advisory_xact_lock`).
3. **Runner Registration:** Both migrations are registered in `migrations` array at indices 16 and 17.
4. **Targeted Execution Support:** Runner filters by exact filename argument (`process.argv[2]`), ensuring precise one-at-a-time or sequential deployment.

### 7.3. Logical Backup & Restore Evidence
- **Managed PITR vs Logical Backup Distinction:**
  - **Managed PITR:** Continuous PostgreSQL WAL archiving is active (`archive_mode = on`, `wal_level = logical`), but Supabase Free plan does not provide self-service point-in-time recovery via control plane.
  - **Logical Backup Artifacts:** 3 off-cluster verified SQL exports are present and readable in `scratch/backups/`:
    - `striva_staging_baseline_25_schema.sql` (285,472 bytes)
    - `striva_staging_baseline_25_auth.sql` (3,613 bytes)
    - `striva_staging_baseline_25_data.sql` (48,208 bytes)
  - **Disposable Restore Verification:** Restored and rehearsed in DB-5E, Phase 12A, and Phase 12B on isolated local PostgreSQL 18.3.

---

## 8. Remaining Blockers & Next Action

### 8.1. Remaining Blockers
- **Technical Blockers:** **NONE.** All schema alterations, repository updates, test suites, builds, and preflight validations have completed with 100% success.
- **Operational Gate:** Requires explicit user authorization before connecting to remote staging or running migrations.

### 8.2. Exact Next Actions Upon User Approval
1. Execute targeted staging deployment of Phase 12A:
   ```bash
   node backend/scripts/apply_staging_migrations.js phase_12_legacy_routine_hardening.sql
   ```
2. Confirm staging baseline advances to 27.
3. Execute targeted staging deployment of Phase 12B:
   ```bash
   node backend/scripts/apply_staging_migrations.js phase_12b_consumer_analytics_persistence.sql
   ```
4. Confirm staging baseline advances to 28.
5. Perform post-deployment read-only verification on staging.

---

## Final Phase Verdict

```
PHASE 12B READY FOR STAGING DEPLOYMENT APPROVAL
```
