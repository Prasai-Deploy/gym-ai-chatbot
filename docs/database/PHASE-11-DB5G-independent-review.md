# STRIVA V2 — Phase 11 / DB-5G: Independent Safety Review of Legacy Identity Remediation

**Document Version:** 1.1.0  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Current Migration Baseline:** Exactly 25 migrations (through Phase 10B)  
**Disposable Test Environment:** Isolated local PostgreSQL 18.3 on `127.0.0.1:5433`  
**Remote DDL/DML/RPC Mutations:** Strictly 0 (Production and Staging Untouched)  
**Target Migration Draft:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`  
**Independent Review Verdict:** **PASS (READY FOR OPERATOR DEPLOYMENT GATE)**

---

## 1. Executive Summary & Verdict

An independent technical and security review was performed on the DB-5F remediation applied to `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`.

The review independently inspected:
1. The canonical identity bridge `public.legacy_user_id_map` (deployed in Phase 9B).
2. The complete PL/pgSQL logic of `public.reset_demo_account(target_user_id UUID)`.
3. The catalog data types and foreign key constraints across all 17 tables affected by the reset sequence.
4. The transaction boundaries, advisory lock `746291048201582`, and privilege grants.
5. Executable regression test suites running on a freshly restored clone of the 25-migration staging baseline on local PostgreSQL 18.3.

### Review Verdict Matrix

| Review Dimension | Status | Summary Finding |
| :--- | :---: | :--- |
| **Identity Bridge Integrity** | **PASS** | `public.legacy_user_id_map` enforces `PRIMARY KEY (legacy_integer_id)` and `UNIQUE (profile_id)`. Mapping lookup `WHERE profile_id = target_user_id` is unambiguous, type-safe, and includes an explicit multi-mapping defense guard (`COUNT(*) <= 1`). |
| **Legacy Deletion Type-Safety** | **PASS** | Every one of the 12 legacy tables uses `WHERE user_id = v_legacy_user_id` (`INTEGER = INTEGER`). Zero `operator does not exist: integer = uuid` runtime errors. Verified against PostgreSQL catalog types. |
| **Modern V2 Deletion Safety** | **PASS** | V2 tables (`v2_workout_sessions`, `v2_workout_plans`, `v2_nutrition_logs`, `exercise_sets`) retain UUID predicates strictly scoped to `target_user_id`. |
| **Hydration Dual-Key Isolation** | **PASS** | `public.water_logs` safely handles both modern and legacy keys via `WHERE profile_id = target_user_id OR (v_legacy_user_id IS NOT NULL AND user_id = v_legacy_user_id)`. Preserves other users' records. |
| **Authorization & Fail-Closed Gates** | **PASS** | Strict case-insensitive equality against `demo@sweatfix.com`. Non-demo profiles, malicious substrings (`demosthenes@...`, `academic.democracy@...`), and domain suffix attacks are blocked prior to any DML. |
| **Transaction Atomicity & Rollback** | **PASS** | Procedure executes within an ACID transaction; mid-operation failures roll back 100% of partial deletions. |
| **Routine Privileges & Search Paths** | **PASS** | Execution revoked from `PUBLIC`, `anon`, and `authenticated`; granted strictly to `service_role`. All 4 routines pin `search_path = pg_catalog, pg_temp`. |
| **Fresh Baseline Rehearsal** | **PASS** | Fresh restoration of the 25-migration baseline cleanly accepted `phase_11_prelaunch_hardening.sql` with zero DDL or catalog conflicts. |
| **Overall Gate Verdict** | **PASS** | The technical migration package is **APPROVED** and ready for controlled operator deployment to staging project `ymrblyiwohvxptiqjfsi`. |

---

## 2. Findings Log & Severity Classification

| Finding ID | Classification | Severity | Description & Resolution |
| :--- | :--- | :---: | :--- |
| **DB5E-01** | Defect (Type Mismatch) | **RESOLVED** | Unpatched `reset_demo_account` attempted `integer = uuid` comparison on legacy tables, causing fatal error `42883`. Resolved in DB-5F using `public.legacy_user_id_map` integer resolution. Independently confirmed resolved. |
| **DB5A-01** | Vulnerability (Loose Auth) | **RESOLVED** | Initial draft used `LIKE '%demo%'`, permitting spoofing via `demosthenes@gmail.com`. Remediated in DB-5B using strict equality `LOWER(v_demo_email) <> 'demo@sweatfix.com'`. Independently confirmed resolved. |
| **DB5G-I01** | Informational (Runner Integration) | **INFO** | `apply_staging_migrations.js` wraps migrations in `BEGIN`/`COMMIT` and advisory lock `746291048201582`. To deploy via the runner, `phase_11_prelaunch_hardening.sql` must be appended to the runner's migration array list. |
| **DB5G-I02** | Commercial Gate | **INFO** | B2B gym tier pricing and Indian GST (18%) invoicing rules remain fail-closed pending stakeholder business sign-off. This exclusion is correctly maintained in DB-5. |

---

## 3. Independent Analysis of the Identity Bridge (`public.legacy_user_id_map`)

### 3.1. Schema Integrity & Uniqueness
From the restored staging baseline (Phase 9B migration):
```sql
CREATE TABLE public.legacy_user_id_map (
    legacy_integer_id INT PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    verification_method TEXT NOT NULL DEFAULT 'oauth_sub_and_email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

1. **Unambiguous 1:1 Mapping:**
   - `PRIMARY KEY (legacy_integer_id)` guarantees one legacy integer ID cannot map to multiple profiles.
   - `UNIQUE (profile_id)` guarantees one profile UUID cannot claim multiple legacy IDs.
2. **Lookup Safety in `reset_demo_account`:**
   ```sql
   SELECT COUNT(*), MAX(legacy_integer_id)
   INTO v_mapping_count, v_legacy_user_id
   FROM public.legacy_user_id_map
   WHERE profile_id = target_user_id;

   IF v_mapping_count > 1 THEN
       RAISE EXCEPTION 'Integrity violation: multiple legacy mappings found for target user %', target_user_id;
   END IF;
   ```
3. **Defense-in-Depth against Multiple Mappings:**
   - Even if database constraints were somehow relaxed or bypassed, `v_mapping_count > 1` aborts the transaction before any deletion occurs.
   - Verified empirically in local test `VERIFY 6B`: dropping the unique constraint and inserting two mappings causes `reset_demo_account` to raise `Integrity violation: multiple legacy mappings found for target user`, successfully rolling back.
4. **Missing Mapping Handling:**
   If `target_user_id` has no mapping (`v_mapping_count = 0`), `v_legacy_user_id` evaluates to `NULL`. The procedure encapsulates legacy deletions inside:
   ```sql
   IF v_legacy_user_id IS NOT NULL THEN
       -- Execute legacy deletions
   END IF;
   ```
   This guarantees that pure V2 demo accounts (such as `demo@sweatfix.com` in staging, which was created in V2 and has no legacy integer records) are purged in modern V2 tables without guessing legacy IDs or deleting rows with `user_id IS NULL`.
5. **Cross-User Identity Resolution Protection:**
   The predicate `WHERE profile_id = target_user_id` filters strictly by the authenticated target profile UUID. Because `profile_id` is unique, it is mathematically impossible for the lookup to resolve a legacy integer ID belonging to another user.

---

## 4. Deletion Dependency & Type-Safety Matrix

Every table referenced in `reset_demo_account` was independently verified against the restored staging catalog (`information_schema.columns` and `pg_constraint`):

| Step | Target Table | Target Column | Deployed Data Type | Predicate Variable | Predicate Type | Dependency & Ordering Rationale |
| :---: | :--- | :--- | :---: | :--- | :---: | :--- |
| **1** | `public.exercise_sets` | `session_id` | `UUID` | subquery on `v2_workout_sessions.id` | `UUID` | Child of `v2_workout_sessions`; deleted first to prevent FK violation. |
| **2a** | `public.v2_workout_sessions` | `user_id` | `UUID` | `target_user_id` | `UUID` | Parent of `exercise_sets`; deleted after child sets. |
| **2b** | `public.v2_workout_plans` | `user_id` | `UUID` | `target_user_id` | `UUID` | Independent V2 table referencing `profiles(id)`. |
| **2c** | `public.v2_nutrition_logs` | `user_id` | `UUID` | `target_user_id` | `UUID` | Independent V2 table referencing `profiles(id)`. |
| **3** | `public.water_logs` | `profile_id` / `user_id` | `UUID` / `INT` | `target_user_id` / `v_legacy_user_id` | `UUID` / `INT` | Dual-key table; purges both V2 profile and legacy integer hydration logs. |
| **4a** | `public.user_fitness_plans` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Child of `chatbot_generated_workouts` & `diets`; deleted before parents. |
| **4b** | `public.chatbot_generated_plans` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Independent legacy plan records. |
| **4c** | `public.chatbot_generated_workouts` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Parent of `user_fitness_plans`; deleted after child. |
| **4d** | `public.chatbot_generated_diets` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Parent of `user_fitness_plans`; deleted after child. |
| **4e** | `public.workout_logs` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Child referencing `workout_plans(id)`; deleted before parent plan. |
| **4f** | `public.workout_sessions` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Child referencing `workout_plans(id)`; deleted before parent plan. |
| **4g** | `public.workout_plans` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Parent of sessions and logs; deleted after both children. |
| **4h** | `public.progress_logs` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Independent legacy progress logs. |
| **4i** | `public.user_progress` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Independent legacy user progress tracking. |
| **4j** | `public.user_meal_tracking` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Independent legacy meal tracking records. |
| **4k** | `public.daily_plans` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Independent legacy daily plans. |
| **4l** | `public.progress` | `user_id` | `INTEGER` | `v_legacy_user_id` | `INTEGER` | Independent legacy aggregate progress. |

### Hydration Isolation Verification (`public.water_logs`)
The combined predicate:
```sql
DELETE FROM public.water_logs 
WHERE profile_id = target_user_id 
   OR (v_legacy_user_id IS NOT NULL AND user_id = v_legacy_user_id);
```
- **Mapped Demo Account:** Purges records holding `profile_id = target_user_id` and legacy records holding `user_id = v_legacy_user_id`.
- **Unmapped Demo Account (`v_legacy_user_id IS NULL`):** Evaluates `(v_legacy_user_id IS NOT NULL AND ...)` to `FALSE`. Deletes only `profile_id = target_user_id`. Zero legacy integer rows are evaluated or deleted.
- **Cross-User Protection:** Preserves User 153's 12 historical rows (`user_id = 153`, `profile_id IS NULL`) and User 148's rows. Verified empirically in test `VERIFY 5`.

### Preserved Exclusions (Demo Reset Contract)
The reset contract explicitly requires retaining account standing while clearing transactional activity:
- `public.profiles`: Preserved (demo identity row `demo@sweatfix.com` remains active).
- `public.subscriptions`: Preserved (permanent free demo subscription remains active).
- `public.member_settings`: Preserved (demo UI preferences remain intact).
- Shared catalogs (`exercises`, `equipment`): Untouched.
- Audit & billing records: Untouched.

---

## 5. Fresh Empirical Verification Evidence (DB-5G)

All checks were executed afresh against an isolated disposable database (`striva_db5g_review` on `127.0.0.1:5433`) created from the staging baseline 25 backup:

### 5.1. Fresh Automated Test Run Log (`test_db5g_independent_verification.js`)
Execution Timestamp: `2026-10-13 23:08:24`

```
================================================================
STRIVA V2 — DB-5G: INDEPENDENT VERIFICATION OF REMEDIATION
Target: Local isolated PostgreSQL 18.3 on 127.0.0.1:5433
================================================================

[SETUP] Creating clean disposable review database: striva_db5g_review...
[SETUP] Restoring staging baseline 25 schema and data...
[VERIFY 1] Restored baseline migration count: 25 (Expected: 25)

[VERIFY 2] Applying phase_11_prelaunch_hardening.sql to fresh baseline...
✓ Migration applied cleanly without DDL, syntax, or transactional errors.
✓ profiles.organization_id default is: null (Expected: null)

[VERIFY 3] Inspecting routine search_paths in pg_proc...
  - enforce_workout_session_state_transition: search_path=pg_catalog, pg_temp
  - handle_new_user: search_path=pg_catalog, pg_temp
  - is_org_member: search_path=pg_catalog, pg_temp
  - reset_demo_account: search_path=pg_catalog, pg_temp

[VERIFY 4] Inspecting reset_demo_account routine privileges...
  Grantees: postgres:EXECUTE, service_role:EXECUTE
✓ Privilege hardening verified: execution granted exclusively to service_role.

[VERIFY 5] Testing mapped demo reset with seeded legacy and V2 records...
✓ All 12 legacy tables cleared for demo account.
✓ Other user legacy data completely preserved.
✓ Modern V2 records purged for demo; other user hydration preserved.

[VERIFY 6] Testing unmapped demo reset (pure V2 user)...
✓ Unmapped demo reset purged V2 records cleanly without guessing legacy IDs.

[VERIFY 4B] Verifying actual PostgreSQL column types for all 12 legacy tables...
  - chatbot_generated_diets.user_id: integer
  - chatbot_generated_plans.user_id: integer
  - chatbot_generated_workouts.user_id: integer
  - daily_plans.user_id: integer
  - progress.user_id: integer
  - progress_logs.user_id: integer
  - user_fitness_plans.user_id: integer
  - user_meal_tracking.user_id: integer
  - user_progress.user_id: integer
  - workout_logs.user_id: integer
  - workout_plans.user_id: integer
  - workout_sessions.user_id: integer
✓ All 12 legacy tables confirmed to have integer user_id columns.

[VERIFY 6B] Testing mapping uniqueness constraints and duplicate mapping defense...
  ✓ Database UNIQUE(profile_id) constraint rejected duplicate mapping attempt.
  ✓ Procedure v_mapping_count > 1 defensive guard successfully aborted with integrity violation.
  ✓ Cleaned up test mapping and restored UNIQUE constraint.

[VERIFY 7] Testing strict authorization gate...
  ✓ Case-insensitive exact match accepted: DEMO@SWEATFIX.COM
  ✓ Rejected: legitimate member
  ✓ Rejected: substring email
  ✓ Rejected: democracy email
  ✓ Rejected: domain suffix attack
  ✓ Rejected: NULL target ID

[VERIFY 8] Testing atomic rollback on injected error...
✓ Mid-operation failure rolls back atomically (1 row preserved).

[CLEANUP] Dropped review database striva_db5g_review.

================================================================
ALL DB-5G INDEPENDENT VERIFICATION CHECKS PASSED EMPIRICALLY!
================================================================
```

### 5.2. Fresh Vitest Security & Integration Suites
All test suites were freshly executed on 2026-10-13 between 23:08:29 and 23:09:21:

1. **Targeted Demo Authorization Security Suite (`db5b_demo_reset_authorization`):**  
   - Command: `npx vitest run --config backend/vitest.config.ts backend/tests/security/db5b_demo_reset_authorization.security.test.ts`  
   - Result: **10/10 PASS** (Duration: 269ms, tests: 8ms).
2. **Phase 9A & Phase 9B Security Suites (`phase9a_rls_recursion_fix`, `phase9b_identity_bridge`):**  
   - Command: `npx vitest run --config backend/vitest.config.ts backend/tests/security/phase9a_rls_recursion_fix.security.test.ts backend/tests/security/phase9b_identity_bridge.security.test.ts`  
   - Result: **77/77 PASS** (Duration: 1.76s).
3. **DB-4C Real PostgreSQL 18 Integration Suite (`db4_real_postgres.integration.test.ts`):**  
   - Command: `npx vitest run --config backend/vitest.config.ts backend/tests/integration/db4_real_postgres.integration.test.ts`  
   - Result: **15/15 PASS** (Duration: 2.13s, tests: 1902ms).
4. **Backend Unit Suites (`backend/tests/unit`):**  
   - Command: `npx vitest run --config backend/vitest.config.ts backend/tests/unit`  
   - Result: **84/84 PASS** (Duration: 1.64s).
5. **Workspace Production Build (`npm run build`):**  
   - Command: `npm run build`  
   - Result: Frontend Vite + Backend TypeScript compile cleanly with **0 errors (Exit code 0)** in 9.34s.

---

## 6. Migration Safety & Technical Readiness

1. **Transactional Enclosure:** The migration executes inside an atomic block guarded by advisory lock `746291048201582`.
2. **Compatibility with Migration Runner:**
   - In `backend/scripts/apply_staging_migrations.js`:
     The runner acquires the transaction lock and checks `_migrations`.
     To deploy via the runner, `phase_11_prelaunch_hardening.sql` must be appended to the runner's internal array before execution.
3. **Baseline Evolution:** Deploying this migration advances staging from migration baseline **25** to **26**.
4. **Backup Checkpoint:** Covered by the DB-5E backup artifacts stored in `scratch/backups/`:
   - `striva_staging_baseline_25_schema.sql` (285,472 bytes)
   - `striva_staging_baseline_25_auth.sql` (1,840 bytes)
   - `striva_staging_baseline_25_data.sql` (48,208 bytes)
5. **Runbook Compliance:** Documented in [PHASE-11-DB5E-recovery-runbook.md](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/PHASE-11-DB5E-recovery-runbook.md).

---

## 7. Hard Stop & Deployment Recommendation

- **Staging Project:** `ymrblyiwohvxptiqjfsi`
- **Current Baseline:** 25 migrations
- **Remote Mutations Executed During Review:** 0
- **Production Access:** Strictly 0
- **Draft Modifications During Review:** 0 (Migration file preserved exactly as finalized in DB-5F)
- **Deployment Status:** **HALTED (AWAITING OPERATOR AUTHORIZATION)**. In strict adherence to workflow rules, no remote migration was executed.
- **Recommendation:** With all technical reviews passed, findings resolved, and full empirical tests verified, `backend/supabase/migrations/phase_11_prelaunch_hardening.sql` is ready for controlled deployment to staging upon explicit operator authorization.
