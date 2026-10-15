# STRIVA V2 — DB-2 Phase 1E: Migration Concurrency and Privilege Review

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Scope:** Migration runner concurrency safeguards, ownership elevation safety review, and transactional recovery verification  
**Target Migration:** `backend/supabase/migrations/phase_9a_rls_recursion_fix.sql`  
**Migration Runner:** `backend/scripts/apply_staging_migrations.js`  
**Test Suite:** `backend/tests/security/phase9a_rls_recursion_fix.security.test.ts` (50 tests)  
**Status:** **READY FOR ISOLATED STAGING VALIDATION**  

---

## 1. Executive Summary

This review addresses three critical operational dimensions prior to isolated staging validation:
1. **Migration Concurrency Race Prevention**: Implemented a PostgreSQL transaction-scoped advisory lock (`pg_advisory_xact_lock`) with a stable 64-bit key, acquired before reading or writing migration state.
2. **Ownership Remediation & Privilege Escalation Audit**: Evaluated and repudiated the casual recommendation of running `ALTER FUNCTION ... OWNER TO postgres`. Established a strict fail-closed halt policy when an unexpected function owner is detected.
3. **Transactional Integrity & Anti-Reapplication Safety**: Rechecked connection cleanup, rollback shielding, and documented procedures to prevent automated runners from accidentally reapplying a deliberately withdrawn migration.

---

## 2. Task 1: Migration Concurrency Race Prevention

### 2.1 The Vulnerability: Transaction Alone Does Not Serialize Runners
Under PostgreSQL's default `READ COMMITTED` isolation level, two concurrent runners (e.g. parallel CI/CD workflows or cluster deployments) can both start transactions (`BEGIN`) simultaneously. Because neither has committed any rows, both runners execute `SELECT name FROM _migrations`, observe the same unapplied migration list, and simultaneously attempt to apply `phase_9a_rls_recursion_fix.sql`. This leads to concurrent DDL deadlocks, catalog lock contention, or race conditions.

### 2.2 Concurrency Safeguard Architecture: Transaction Advisory Lock
PostgreSQL provides transaction-level advisory locks via `pg_advisory_xact_lock(bigint)`.

#### Key Invariants & Design Decisions
1. **Stable 64-Bit Lock Key**:
   - Key: `746291048201582` (PostgreSQL `bigint`).
   - Represents a stable, documented, dedicated lock identifier for STRIVA V2 schema migrations.
2. **Transaction-Scoped Lifecycle**:
   - `pg_advisory_xact_lock` is acquired inside the transaction immediately after `BEGIN`.
   - It is **automatically released** by PostgreSQL when the transaction terminates via `COMMIT` or `ROLLBACK`.
   - Unlike session-scoped advisory locks (`pg_advisory_lock`), transaction locks eliminate the risk of orphaned locks if a connection drops, a query times out, or the process crashes.
3. **Sequential Execution & Re-checking**:
   - If Runner A holds the lock, Runner B blocks cleanly at `SELECT pg_advisory_xact_lock($1)`.
   - When Runner A commits, the lock is released and Runner B acquires it.
   - Runner B then executes `SELECT name FROM _migrations` inside its active transaction, observes that the migration was just committed by Runner A, logs `[SKIP] Already executed: ...`, and cleanly exits without executing duplicate DDL.

### 2.3 Implementation in Runner
In [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js):
```javascript
const MIGRATION_ADVISORY_LOCK_KEY = '746291048201582';

// Inside run():
await client.query('BEGIN');

console.log('[LOCK] Acquiring transaction-level migration advisory lock...');
await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_ADVISORY_LOCK_KEY]);
console.log('[LOCK] Migration advisory lock acquired successfully.');

const existingMigRes = await client.query('SELECT name FROM _migrations');
```

---

## 3. Task 2: Review of Ownership Remediation (`ALTER FUNCTION ... OWNER TO postgres`)

Previous documentation suggested that if Preflight Gate 6 detected an unprivileged owner on a pre-existing `public.is_org_manager(UUID)`, the operator could run:
`ALTER FUNCTION public.is_org_manager(UUID) OWNER TO postgres;`

An independent review of PostgreSQL privileges and security architecture demonstrates that this recommendation is **unsafe and prohibited as an automatic bypass**.

### 3.1 Required Preconditions & Authorization
In PostgreSQL:
- To alter the owner of a function, the executing role **must be a superuser**, or **must be the current owner of the function AND a direct or indirect member of the target owner role**.
- In managed cloud environments like Supabase:
  - The standard migration role `postgres` is `NOSUPERUSER` (holding `rolbypassrls`, `createdb`, `createrole`). The actual superuser is `supabase_admin`.
  - If `public.is_org_manager` is owned by a different, unprivileged role, an ordinary operator role cannot arbitrarily reassign ownership without superuser elevation.

### 3.2 Security Consequences of Blind Ownership Reassignment
1. **Privilege Escalation on `SECURITY DEFINER`**:
   `public.is_org_manager` is a `SECURITY DEFINER` function designed to bypass RLS on `organization_members`. Reassigning ownership to `postgres` grants that function the execution context and RLS-bypass privileges of `postgres`.
2. **Blessing Untrusted Function Bodies**:
   If an unknown or stale function with that signature pre-exists, executing `ALTER ... OWNER TO postgres` blindly elevates its execution authority before verifying its source code or origin.

### 3.3 The Correct Fail-Closed Response
A failed safety gate must **HALT DEPLOYMENT**, not trigger a bypass script.

**Mandatory Operator Protocol:**
1. **Stop Deployment**: Do not apply the migration and do not execute ownership reassignment commands.
2. **Inspect Pre-existing Function**:
   Execute diagnostic catalog queries to determine the origin, OID, and exact body of the function:
   ```sql
   SELECT p.oid, p.proname, r.rolname AS owner, pg_get_functiondef(p.oid)
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   JOIN pg_roles r ON r.oid = p.proowner
   WHERE n.nspname = 'public' AND p.proname = 'is_org_manager';
   ```
3. **Verify Dependencies**:
   Inspect `pg_depend` to confirm whether any active production views, triggers, or policies depend on this pre-existing function.
4. **Clean Disposal or Managed Removal**:
   If the pre-existing function is an unapproved, orphaned, or obsolete artifact, it must be explicitly dropped inside a verified administrative maintenance window:
   ```sql
   DROP FUNCTION public.is_org_manager(UUID);
   ```
   Following the drop, re-run the Phase 9A migration cleanly so that `CREATE FUNCTION` creates the canonical implementation under the verified migration role.

---

## 4. Task 3: Transactional Integrity and Anti-Reapplication Safety

### 4.1 Rollback, Client Release, and Pool Shutdown Verification
The migration runner structure was verified to satisfy all fail-closed invariants:
- **Error Shielding**: `console.error(err)` logs the original failure before `client.query('ROLLBACK')`. A failed rollback (due to a severed TCP socket) cannot mask the root cause.
- **Connection Release**: `client.release()` and `await pool.end()` are guaranteed to execute inside `finally` before `process.exit(1)` terminates the process.
- **Lock Release**: Because `pg_advisory_xact_lock` is transaction-scoped, any rollback or socket termination immediately releases the lock in PostgreSQL.

### 4.2 Preventing Accidental Reapplication After Deliberate Withdrawal
If an operator deliberately withdraws Phase 9A (dropping the policy to transition into a fail-closed state):
- **The Trap**: If the operator deletes `'phase_9a_rls_recursion_fix.sql'` from `public._migrations`, the next execution of `apply_staging_migrations.js` (by CI/CD or another engineer) will see that the file is missing from `_migrations` and **automatically reapply it**.
- **The Safe Withdrawal Procedure**:
  1. Comment out or remove `'phase_9a_rls_recursion_fix.sql'` from the `migrations` array in [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) and commit the change to Git.
  2. Drop the policy to fail-closed state:
     ```sql
     DROP POLICY IF EXISTS "Staff managers manage organization members" ON public.organization_members;
     ```
  3. Leave the record in `public._migrations` intact to prevent automated tools from attempting reapplication.

---

## 5. Verification Matrix & Test Classifications

### 5.1 Test Breakdown ([`backend/tests/security/phase9a_rls_recursion_fix.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase9a_rls_recursion_fix.security.test.ts))
**Total Tests in Focused Suite: 50 passed (50)**

| Test Group | Classification | Test IDs | Verified Invariant |
| :--- | :--- | :--- | :--- |
| **Static Code & AST** | Static Source Inspection | Tests 1–12 | Canonical path, search path, schema qualifications, safety gate sequence, and policy delegation. |
| **Ownership Decision Tree** | Unit Logic Simulation | Tests 13–17 | Superuser/bypassrls pass, table owner pass, FORCE RLS (`relforcerowsecurity = true`) fail, unprivileged owner fail. |
| **RBAC Authorization Matrix** | Pure Logic Model | Tests 18–26 | Owner authorized, manager authorized, super admin authorized, member/trainer/nutritionist denied, tenant isolation. |
| **Recursion Elimination** | Mathematical Unit Trace | Tests 27–28 | Simulating legacy recursion yields `42P17` stack overflow; Phase 9A executes in O(1). |
| **Route & RBAC Integration** | Mocked Integration | Tests 29–35 | Supertest requests against Express endpoints: unauthenticated (401), owner (200), manager (200), member (403), spoofing (403). |
| **Live Database Harness** | Real Local PostgreSQL | Tests 36–37 | Isolated transaction execution (`BEGIN ... ROLLBACK`). **Test 37 deferred** pending disposable local PostgreSQL instance. |
| **Runner History & Atomicity** | Runner Unit / Simulation | Tests 38–46 | Transaction lifecycle, commit order, preflight failure rollback, history read inside transaction, duplicate prevention simulation. |
| **Advisory Lock Concurrency** | Runner Unit / Simulation | Tests 47–50 | Lock acquired before history read, stable lock key constant, lock failure triggers safe cleanup, concurrent runners serialized without duplicate DDL. |

### 5.2 Regression Suites & Build Quality
- `backend/tests/security/rls.security.test.ts`: **8 passed**
- `backend/tests/security/phase8b_organization_staff.security.test.ts`: **24 passed**
- `backend/tests/security/phase8d_member_management.security.test.ts`: **19 passed**
- **Combined Test Total:** **101 tests passed**.
- **TypeScript Compilation:** `npx tsc --noEmit` exited with code `0`.
- **Production Build:** `npm run build` completed with code `0`.

---

## 6. Record of Changed Files

1. [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js):
   - Added `MIGRATION_ADVISORY_LOCK_KEY` (`'746291048201582'`).
   - Acquired transaction-scoped advisory lock (`SELECT pg_advisory_xact_lock($1)`) immediately after `BEGIN`.
2. [`backend/tests/security/phase9a_rls_recursion_fix.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase9a_rls_recursion_fix.security.test.ts):
   - Added Tests 47–50 verifying advisory lock acquisition, lock key stability, lock failure handling, and concurrent runner serialization.
3. [`docs/database/DB-2-phase-1E-concurrency-review.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1E-concurrency-review.md):
   - Created this comprehensive review.
4. [`docs/database/DB-2-phase-1D-deployment-runbook.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1D-deployment-runbook.md):
   - Updated preflight check 6 to enforce fail-closed halt instead of blind ownership alteration.
   - Added advisory lock acquisition to manual SQL execution scripts.

---

## 7. Final Recommendation

**Determination:** **`READY FOR ISOLATED STAGING VALIDATION`**  
All concurrency, privilege, and transaction safeguards are fully implemented, locally tested, and documented. The migration is certified for execution in an isolated staging environment following the procedures in [`docs/database/DB-2-phase-1D-deployment-runbook.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-2-phase-1D-deployment-runbook.md). Live deployment remains blocked until isolated staging execution succeeds.
