# STRIVA V2 — Phase 11 / DB-5K: Staging Migration Runner Target Guard Report

**Document Version:** 1.0.0  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi`  
**Expected Staging Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co`  
**Target Migration:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`  
**Verified Migration SHA-256:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`  
**Remote DDL/DML Applied:** Strictly 0 (Local code implementation & test verification only)  
**Live Staging Baseline:** Exactly 25 migrations (Untouched)  
**Production Database:** Strictly Untouched  

---

## 1. Executive Summary

In DB-5J preflight, deployment was gated as **BLOCKED — DO NOT DEPLOY** because `backend/scripts/apply_staging_migrations.js` lacked programmatic verification that `DATABASE_URL` strictly points to the authorized staging database before initiating network traffic or instantiating a connection pool.

Under **DB-5K**, an airtight, fail-closed environment target guard has been implemented in `backend/scripts/apply_staging_migrations.js` alongside a dedicated security test suite in `backend/tests/security/db5k_staging_target_guard.security.test.ts`.

### Key Implementation Invariants:
1. **Fail-Closed Execution:** The guard executes before `new pg.Pool(...)` or `pool.connect()`. Any validation failure throws a sanitized error and terminates execution with exit code 1 without establishing any network connection.
2. **Exact Hostname Equality:** Hostname parsed via standard `new URL(...)` must match `db.ymrblyiwohvxptiqjfsi.supabase.co` with 100% precision.
3. **Project Reference Structural Decomposition:** The hostname is segmented into domain components: `['db', 'ymrblyiwohvxptiqjfsi', 'supabase', 'co']`. This completely neutralizes domain-suffix attacks (`host.attacker.com`), lookalike prefix attacks (`evil-db...`), typosquatting (`jfs1`), and username/path evasion attempts.
4. **Credential Redaction Guarantee:** The guard never logs or returns connection strings, passwords, or authentication credentials in error messages or diagnostic logs.
5. **Architectural Preservation:** Transaction boundaries (`BEGIN`/`COMMIT`/`ROLLBACK`), the 64-bit advisory lock `746291048201582`, exact-filename targeting (`process.argv[2]`), and atomic recording into `public._migrations` remain untouched.
6. **Zero Remote Mutation:** Neither staging nor production databases underwent any DDL, DML, or schema alterations. Staging remains at exactly 25 migrations.
7. **Migration Hash Invariant:** SHA-256 of `phase_11_prelaunch_hardening.sql` remains bit-for-bit identical to the reviewed DB-5I hash: `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`.

---

## 2. List of Files Changed & Created

1. **`backend/scripts/apply_staging_migrations.js`** *(Modified)*
   - Added exported constants:
     - `EXPECTED_STAGING_HOST = 'db.ymrblyiwohvxptiqjfsi.supabase.co'`
     - `EXPECTED_STAGING_PROJECT_REF = 'ymrblyiwohvxptiqjfsi'`
   - Implemented and exported `validateStagingDatabaseUrl(dbUrl)` function.
   - Guarded runner entrypoint: `validateStagingDatabaseUrl(process.env.DATABASE_URL)` is invoked strictly before `new pg.Pool(...)`.
   - Wrapped automatic script invocation in an entrypoint check (`isDirectRun`) so the module can be cleanly imported into automated unit and security test suites without side effects.
2. **`backend/tests/security/db5k_staging_target_guard.security.test.ts`** *(Created)*
   - 17 unit and security test cases verifying all acceptance, rejection, evasion defense, and runner integrity invariants.

---

## 3. Detailed Guard Mechanics & Project Identity Validation

### 3.1. Implementation in `backend/scripts/apply_staging_migrations.js`

```javascript
export const EXPECTED_STAGING_HOST = 'db.ymrblyiwohvxptiqjfsi.supabase.co';
export const EXPECTED_STAGING_PROJECT_REF = 'ymrblyiwohvxptiqjfsi';

/**
 * Validates that DATABASE_URL strictly points to the authorized STRIVA V2 staging database.
 * Fails closed before any database connection or pool creation is attempted.
 * Never logs or returns raw credentials or connection strings.
 *
 * @param {string | undefined} dbUrl - The database connection URL to validate.
 * @returns {{ host: string, projectRef: string, port: string }} Validated metadata.
 * @throws {Error} Redacted error if URL is missing, malformed, or points to an unauthorized host.
 */
export function validateStagingDatabaseUrl(dbUrl) {
  if (!dbUrl || typeof dbUrl !== 'string' || dbUrl.trim() === '') {
    throw new Error('FAIL-CLOSED TARGET GUARD: DATABASE_URL is missing or empty. Staging runner aborted before connecting.');
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error('FAIL-CLOSED TARGET GUARD: DATABASE_URL is malformed or invalid. Staging runner aborted before connecting.');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      `FAIL-CLOSED TARGET GUARD: Unauthorized protocol "${parsed.protocol}". Expected "postgresql:" or "postgres:". Staging runner aborted before connecting.`
    );
  }

  const hostname = parsed.hostname;

  // Strict exact hostname equality assertion (prevents subdomains, domain suffix attacks, lookalikes)
  if (hostname !== EXPECTED_STAGING_HOST) {
    throw new Error(
      `FAIL-CLOSED TARGET GUARD: Unauthorized database host "${hostname}". Expected strictly "${EXPECTED_STAGING_HOST}". Staging runner aborted before connecting.`
    );
  }

  // Exact project reference structural assertion: db.<project-ref>.supabase.co
  const parts = hostname.split('.');
  if (
    parts.length !== 4 ||
    parts[0] !== 'db' ||
    parts[1] !== EXPECTED_STAGING_PROJECT_REF ||
    parts[2] !== 'supabase' ||
    parts[3] !== 'co'
  ) {
    throw new Error(
      `FAIL-CLOSED TARGET GUARD: Hostname structure invalid. Project reference must equal "${EXPECTED_STAGING_PROJECT_REF}". Staging runner aborted before connecting.`
    );
  }

  return {
    host: hostname,
    projectRef: EXPECTED_STAGING_PROJECT_REF,
    port: parsed.port || '5432'
  };
}
```

### 3.2. Pre-Connection Call Sequence in `run()`

```javascript
export async function run() {
  console.log('=== STRIVA V2 STAGING MIGRATION RUNNER ===');

  // Guard 1: Validate target database identity before pool creation or network activity
  console.log('[GUARD] Verifying target database host and project identity...');
  let targetInfo;
  try {
    targetInfo = validateStagingDatabaseUrl(process.env.DATABASE_URL);
  } catch (guardErr) {
    console.error('FATAL TARGET GUARD ERROR:', guardErr.message);
    process.exit(1);
  }
  console.log(`[GUARD] Target verified: Project "${targetInfo.projectRef}" on host "${targetInfo.host}".`);

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  ...
```

---

## 4. Test Verification Suite & Results

### 4.1. Staging Target Guard Suite (`db5k_staging_target_guard.security.test.ts`)
Run command: `npx vitest run -c backend/vitest.config.ts backend/tests/security/db5k_staging_target_guard.security.test.ts`
Result: **17 passed / 17 tests (100% pass)**

| Test Group | Test Case | Expected Behavior | Actual Result |
| :--- | :--- | :--- | :---: |
| **Part 1: Valid Staging Host** | TEST 1: Canonical staging URL (`postgresql://`) | Accepted with verified host & ref | **PASS** |
| | TEST 2: Canonical staging URL (`postgres://`) | Accepted with verified host & ref | **PASS** |
| | TEST 3: Project reference extraction | Returns `ymrblyiwohvxptiqjfsi` | **PASS** |
| **Part 2: Unauthorized & Prod Hosts** | TEST 4: Production database host | Throws sanitized error; credentials redacted | **PASS** |
| | TEST 5: Localhost / loopback (`127.0.0.1`) | Throws unauthorized host error | **PASS** |
| | TEST 6: Alternate Supabase project references | Throws unauthorized host error | **PASS** |
| **Part 3: Missing & Malformed URLs** | TEST 7: Undefined, null, or empty string | Throws missing/empty URL error | **PASS** |
| | TEST 8: Malformed URLs | Throws malformed/invalid URL error | **PASS** |
| | TEST 9: Unauthorized protocols (`http:`, `mysql:`) | Throws unauthorized protocol error | **PASS** |
| **Part 4: Evasion & Lookalike Attacks** | TEST 10: Suffix attack (`host.attacker.com`) | Throws unauthorized host error | **PASS** |
| | TEST 11: Prefix lookalike (`evil-db...`) | Throws unauthorized host error | **PASS** |
| | TEST 12: Typosquatting (`jfs1` vs `jfsi`) | Throws unauthorized host error | **PASS** |
| | TEST 13: Project ref in username/path | Throws unauthorized host error | **PASS** |
| **Part 5: Runner Invariants** | TEST 14: Guard precedes pool instantiation | Code ordering strictly validated | **PASS** |
| | TEST 15: Exact migration filtering logic | Intact in source code | **PASS** |
| | TEST 16: Advisory lock `746291048201582` & atomic transaction | Intact in source code | **PASS** |
| | TEST 17: `phase_11_prelaunch_hardening.sql` registered as migration 26 | Intact in migrations array | **PASS** |

### 4.2. Core Security & Identity Suites
Run command: `npx vitest run -c backend/vitest.config.ts backend/tests/security/phase9a_rls_recursion_fix.security.test.ts backend/tests/security/db5b_demo_reset_authorization.security.test.ts`
Result: **61 passed / 61 tests (100% pass)**

### 4.3. Full Application Build Verification
Run command: `npm run build`
Result: **Exit code 0 (Frontend & Backend successfully built with zero errors)**

---

## 5. Migration Hash & Remote Database Invariant Verification

### 5.1. Target Migration Hash
- **Target File:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`
- **Expected Hash:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`
- **Calculated Hash:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`
- **Integrity Status:** **100% UNCHANGED (Exact Match)**

### 5.2. Remote Database Invariant Check
Live read-only introspection was performed against `db.ymrblyiwohvxptiqjfsi.supabase.co`:
- **Current Baseline:** Exactly 25 custom migrations in `public._migrations`.
- **Phase 11 Status:** Not recorded / not executed.
- **Profiles Default:** `profiles.organization_id` default remains `'00000000-0000-0000-0000-000000000001'::uuid`.
- **Remote Mutations:** **Strictly 0**.

---

## 6. Preflight Readiness Determination

With the completion and test verification of the fail-closed environment target guard in `backend/scripts/apply_staging_migrations.js`, all conditions identified in DB-5J have been resolved.

# **READY FOR DB-5J PREFLIGHT RE-RUN**
