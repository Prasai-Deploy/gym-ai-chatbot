# STRIVA V2 — DB-3B: Identity Bridge Test Results Report

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Test Engine Environment:** Disposable Local PostgreSQL 18.3 (`127.0.0.1:5433`)  
**Runner:** Vitest v4.1.11 / Node.js v20+ / `pg` v8.11  
**Overall Status:** **46 / 46 TESTS PASSED (100% PASS RATE)**  
**Final Recommendation:** **READY FOR STAGING PREFLIGHT**  

---

## 1. Overview & Test Execution Boundary

To ensure complete verification without risking remote environments, testing was bifurcated into:
1. **Real PostgreSQL 18.3 Integration Engine Tests**: Real DDL statements, real trigger executions, real RLS evaluations with session variables, real constraint enforcement, and real transaction rollbacks against an ephemeral PostgreSQL 18.3 cluster on port 5433.
2. **Security & Contract AST Tests**: Static analysis of migration SQL syntax, schema AST inspection, simulation of deferred claim protocols, and idempotency invariant checks.

```
+-----------------------------------------------------------------------------------------+
|                                    TOTAL TEST SUITE                                     |
|                                     46 / 46 PASSED                                      |
+-----------------------------------------------------------------------------------------+
|  Real PostgreSQL 18.3 Engine Suite:  20 / 20 Passed (393ms execution time)              |
|  Security & Contract AST Suite:      26 / 26 Passed (17ms execution time)               |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Real PostgreSQL 18.3 Integration Test Suite Results

**File:** [`backend/tests/integration/phase9b_real_postgres.integration.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/integration/phase9b_real_postgres.integration.test.ts)  
**Database Cluster:** Ephemeral PostgreSQL 18.3 (`127.0.0.1:5433`)  
**Execution Result:** 20 passed / 0 failed (393ms)

### Section 1: Migration Execution & Evidence Verification
| # | Test Case Description | Real SQL Operation | Expected Result | Status |
| :-: | :--- | :--- | :--- | :---: |
| 1 | Applies `phase_9b_legacy_identity_bridge.sql` without errors | `MIGRATION_SQL` in atomic transaction | Table `public.legacy_user_id_map` created | **PASS** |
| 2 | Seeds ONLY dual-factor corroborated mappings (IDs 148 & 151) | `SELECT * FROM legacy_user_id_map` | Exactly 2 rows (148, 151); 147 and 153 omitted | **PASS** |
| 3 | Preserves all 13 historical water logs; backfills `amount_ml` | `SELECT COUNT(*), amount_ml FROM water_logs` | 13 rows total; 0 NULL `amount_ml`; 12 unmapped for 153; 1 unmapped for 147 | **PASS** |

### Section 2: Real Trigger Behavior Validation (`sync_water_logs_compatibility`)
| # | Test Case Description | Trigger Input | Engine Output / Behavior | Status |
| :-: | :--- | :--- | :--- | :---: |
| 4 | Case 1: INSERT with only `intake_amount` | `(intake_amount: 350)` | `amount_ml` auto-populated to `350` | **PASS** |
| 5 | Case 2: INSERT with only `amount_ml` | `(amount_ml: 500)` | `intake_amount` auto-populated to `500` | **PASS** |
| 6 | Case 3: INSERT with matching values | `(amount_ml: 750, intake_amount: 750)` | Both retained as `750` | **PASS** |
| 7 | Case 4: INSERT with conflicting values | `(amount_ml: 1000, intake_amount: 250)` | Canonical `amount_ml` wins: `1000, 1000` | **PASS** |
| 8 | Case 5: UPDATE changing only `intake_amount` | `SET intake_amount = 600` | `IS DISTINCT FROM` detects change; mirrors to `amount_ml = 600` | **PASS** |
| 9 | Case 6: UPDATE changing only `amount_ml` | `SET amount_ml = 800` | `IS DISTINCT FROM` detects change; mirrors to `intake_amount = 800` | **PASS** |
| 10 | Case 7: UPDATE changing both to conflicting values | `SET amount_ml = 900, intake_amount = 300` | Canonical `amount_ml` wins: `900, 900` | **PASS** |
| 11 | Case 8: Rejects non-positive or NULL volumes | `amount_ml = -100` / `0` / `NULL` | Exception raised: `volume must be strictly positive (> 0 ml)` | **PASS** |
| 12 | Case 9: Translates `profile_id` to `user_id` for mapped users | INSERT `(profile_id: uuid-148)` | `user_id` automatically resolved to `148` | **PASS** |
| 13 | Case 10: Translates legacy `user_id` to `profile_id` for mapped users | INSERT `(user_id: 148)` | `profile_id` automatically resolved to `uuid-148` | **PASS** |

### Section 3: Real PostgreSQL RLS & Tenant Isolation
| # | Test Case Description | Actor / Context | Engine Output / Security Enforcement | Status |
| :-: | :--- | :--- | :--- | :---: |
| 14 | Enforces RLS under `authenticated` role | User A (`uuid-148`) vs User B (`uuid-151`) | User A manages own log; User B sees 0 rows; UPDATE/DELETE affected = 0 | **PASS** |
| 15 | Allows mapped legacy user to access legacy logs | User A (`uuid-148`) on log with `user_id = 148, profile_id = NULL` | Allowed via `EXISTS (SELECT 1 FROM legacy_user_id_map ...)` policy | **PASS** |
| 16 | Keeps unmapped logs (147, 153) completely invisible | Authenticated users querying `user_id IN (147, 153)` | Returns 0 rows (tenant boundary strictly isolates unmapped records) | **PASS** |
| 17 | Allows `service_role` operations | `SET LOCAL ROLE service_role` | Views and manages all 13+ rows | **PASS** |
| 18 | Denies unauthenticated requests completely | `SET LOCAL ROLE anon` | Fails with `42501 permission denied for table water_logs` | **PASS** |

### Section 4: Transaction Atomicity & Failure Rollback
| # | Test Case Description | Execution Scenario | Invariant Verified | Status |
| :-: | :--- | :--- | :--- | :---: |
| 19 | Failed migration transaction leaves no partial state | DDL + DML followed by deliberate division-by-zero error in transaction | Zero schema changes and zero data changes committed | **PASS** |

### Section 5: Rollback Behavior & Non-Destructive Invariant
| # | Test Case Description | Execution Scenario | Invariant Verified | Status |
| :-: | :--- | :--- | :--- | :---: |
| 20 | Non-destructive rollback preserves 13 legacy rows and archives modern V2 records | Post-migration log created (`user_id IS NULL`), followed by archival runbook execution | 13 original legacy rows completely intact; modern V2 log safely captured in `_rollback_v2_water_logs_archive` | **PASS** |

---

## 3. Security & Contract AST Test Suite Results

**File:** [`backend/tests/security/phase9b_identity_bridge.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase9b_identity_bridge.security.test.ts)  
**Execution Result:** 26 passed / 0 failed (17ms)

| Part | Test Range | Scope & Verified Invariants | Status |
| :--- | :---: | :--- | :---: |
| **Part 1: Preflight Syntax & Safety** | Tests 1–4 | Target file existence, prerequisite checks on `public.users`, `public.profiles`, and `public.water_logs`, transactional wrapper idempotency. | **PASS** |
| **Part 2: Structural Integrity & Constraints** | Tests 5–8 | Additive mapping table structure, `PRIMARY KEY (legacy_integer_id)` prevents 1:Many, `UNIQUE (profile_id)` prevents Many:1, `ON DELETE RESTRICT` on legacy user and `ON DELETE CASCADE` on profile. | **PASS** |
| **Part 3: Dual-Factor Evidence Verification** | Tests 9–10 | Automated seed strictly maps only verified users (148 and 151); strictly excludes uncorroborated users (147, 149, 150, 152, 153). | **PASS** |
| **Part 4: Hydration Compatibility Trigger** | Tests 11–18 | Dual-key columns, nullable `user_id` and `profile_id`, backfill logic, non-recursive trigger logic, strictly positive volume check (> 0 ml), conflicting column resolution. | **PASS** |
| **Part 5: Row-Level Security & Grants** | Tests 19–21 | Table RLS enabled, dual-key ownership policy (`auth.uid() = profile_id OR EXISTS (...)`), explicit sequence grants (`water_logs_id_seq`), revokes from `PUBLIC` and `anon`. | **PASS** |
| **Part 6: Hardened Deferred Claim Protocol** | Tests 22–24 | Server-side identity claim simulation: verified user claims legacy account, attacker rejected (`CLAIM_DENIED: Caller attributes do not match`), double-claim attempt rejected. | **PASS** |
| **Part 7: Rollback & Data Preservation** | Tests 25–26 | Post-migration assertion gate verifies zero data loss, User 153 retains 12 unmapped rows, User 147 retains 1 unmapped row, non-destructive rollback runbook. | **PASS** |

---

## 4. Verification Checkpoint Matrix

| Audit Item | Baseline Staging State | Post-Phase 9B Migration State | Verification Method |
| :--- | :--- | :--- | :--- |
| **Total `water_logs` count** | 13 rows | 13 rows (zero data loss) | Verified on PostgreSQL 18.3 engine |
| **Legacy User 153 water logs** | 12 rows (`user_id = 153`) | 12 rows (`user_id = 153, profile_id = NULL`) | Verified on PostgreSQL 18.3 engine |
| **Legacy User 147 water log** | 1 row (`user_id = 147`) | 1 row (`user_id = 147, profile_id = NULL`) | Verified on PostgreSQL 18.3 engine |
| **`legacy_user_id_map` row count** | Table did not exist | Exactly 2 rows (IDs 148 & 151) | Verified on PostgreSQL 18.3 engine |
| **`amount_ml` column** | Did not exist | Populated across 100% of rows | Verified on PostgreSQL 18.3 engine |
| **`water_logs_id_seq` grant** | Unspecified | Granted to `authenticated` and `service_role` | Verified on PostgreSQL 18.3 engine |
| **Unauthenticated access (`anon`)** | Vulnerable in legacy | Revoked & blocked (Fail-Closed) | Verified on PostgreSQL 18.3 engine |
| **Rollback safety for modern V2 rows** | High risk in draft | Preserved via pre-drop archive table | Verified on PostgreSQL 18.3 engine |

---

## 5. Command Output & Raw Verification Log

```bash
> striva-backend@1.0.0 test
> vitest run tests/security/phase9b_identity_bridge.security.test.ts tests/integration/phase9b_real_postgres.integration.test.ts

 RUN  v4.1.11 C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend

 ✓ tests/security/phase9b_identity_bridge.security.test.ts (26 tests) 17ms
 ✓ tests/integration/phase9b_real_postgres.integration.test.ts (20 tests) 393ms

 Test Files  2 passed (2)
      Tests  46 passed (46)
   Start at  21:15:17
   Duration  1.10s (transform 193ms, setup 0ms, import 317ms, tests 410ms, environment 0ms)
```

---

## 6. Final Recommendation

### **`READY FOR STAGING PREFLIGHT`**

The Phase 9B identity bridge migration (`phase_9b_legacy_identity_bridge.sql`) has met all safety, idempotency, mathematical constraint, RLS, and data preservation criteria. 

**Next Steps**:
1. Stop local testing (complete).
2. Do **NOT** connect to remote Supabase or deploy Phase 9B.
3. Present deliverables to the operator for authorized staging preflight review.
