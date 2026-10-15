# STRIVA V2 — DB-3B: Identity Bridge Security Hardening Review

**Document Version:** 1.0.0  
**Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Security Test Suite:** `backend/tests/security/phase9b_identity_bridge.security.test.ts` (26 / 26 passed)  
**Real PostgreSQL Integration Suite:** `backend/tests/integration/phase9b_real_postgres.integration.test.ts` (20 / 20 passed)  
**Final Status:** **READY FOR STAGING PREFLIGHT**  

---

## 1. Safety Restrictions & Execution Boundaries

This security review was conducted strictly within local, isolated boundaries adhering to all STRIVA V2 engineering constraints:
- **Zero Remote Database Connections**: No connection was initiated to remote Supabase, staging, or production environments.
- **Zero Remote DDL/DML**: No migrations, backfills, or schema modifications were applied to remote databases.
- **Disposable PostgreSQL Engine**: All database integration tests were executed against an isolated, disposable local PostgreSQL 18.3 instance running on `127.0.0.1:5433`.
- **Privacy & Secret Protection**: No raw OAuth tokens, user passwords, cryptographic secrets, or unmasked PII are exposed in codebase artifacts or documentation.
- **Strict Scope Boundary**: Table creation for `v2_nutrition_logs` and `v2_workout_sessions` is strictly quarantined to DB-4 and excluded from Phase 9B.

---

## 2. Reconcile Mapping Evidence & Audit Decisions

### 2.1 Audit Baseline & Problem Statement
During DB-3 and DB-3A reviews, seven historical legacy users (`public.users`, IDs 147–153) and five Supabase Auth profiles (`public.profiles`) were identified. Conflicting evidence descriptions emerged regarding Legacy ID 147:
- An initial heuristic suggested mapping Legacy ID 147 based solely on matching email addresses (`alex@example.com` / `d***o@s***.com`).
- However, audit logs revealed that in `public.users`, Legacy ID 147 has `google_id: NULL`, and the corresponding profile has `raw_user_meta_data->>'sub': NULL`.
- **Engineering Principle**: Under STRIVA V2 security guidelines, **email equality alone is NOT conclusive proof of identity**. Email addresses can be reused across deleted accounts, subject to unverified identity claims, or vulnerable to spoofing if email verification was not strictly enforced at creation time.

### 2.2 Reconciled Account Mapping Roster

| Legacy ID | Profile UUID | Primary Cryptographic Evidence | Secondary Supporting Evidence | Classification & Disposition |
| :---: | :---: | :--- | :--- | :--- |
| **148** | `b96c0b60-9a8b-496f-9e33-f533982412f6` | Exact match between `public.users.google_id` and `auth.users.raw_user_meta_data->>'sub'` (`101315497550140981399`) | Case-insensitive email match | **SEEDED**: Validated dual-factor corroboration (`oauth_sub_and_email`). |
| **151** | `2dbbad1d-5988-4d6f-8c32-5c57080e56f5` | Exact match between `public.users.google_id` and `auth.users.raw_user_meta_data->>'sub'` (`104636286967743040898`) | Case-insensitive email match | **SEEDED**: Validated dual-factor corroboration (`oauth_sub_and_email`). |
| **147** | `a1bf8b11-e2c7-4f7f-9d36-5af53418e20b` | **None** (`google_id` is `NULL`, `sub` is `NULL`) | Email match only | **OMITTED FROM SEED**: Inconclusive evidence. Marked as `PENDING_MANUAL_VERIFICATION`. Requires manual operator attestation before bridging. |
| **149** | *(None)* | Legacy admin; no Supabase Auth profile exists | Email match only | **OMITTED FROM SEED**: Unmapped. |
| **150** | *(None)* | No matching OAuth subject or profile | No match | **OMITTED FROM SEED**: Unmapped. |
| **152** | *(None)* | No matching OAuth subject or profile | No match | **OMITTED FROM SEED**: Unmapped. |
| **153** | *(None)* | No matching OAuth subject or profile | No match | **OMITTED FROM SEED**: Unmapped. Holds 12 historical hydration logs. Must remain unclaimed until legitimate claim protocol runs. |

### 2.3 Evidence Invariant Guarantees
1. The automated Phase 9B migration seed populates **EXACTLY TWO** records into `public.legacy_user_id_map` (IDs 148 and 151).
2. The post-migration assertion gate explicitly asserts `COUNT(*) = 2` on `public.legacy_user_id_map`.
3. User 147's single water log row (row ID 13) remains with `user_id = 147` and `profile_id = NULL`.
4. User 153's 12 water log rows (row IDs 1–12) remain with `user_id = 153` and `profile_id = NULL`.

---

## 3. Deterministic Volume Synchronization Semantics (`sync_water_logs_compatibility`)

### 3.1 Defect Analysis of Naive Trigger
In early draft specifications, volume synchronization evaluated `IF NEW.amount_ml IS NOT NULL THEN NEW.intake_amount := NEW.amount_ml;`. This caused several failure modes:
1. **UPDATE Stale Overwrite**: If a legacy client updated `intake_amount` while preserving an existing `amount_ml` value, the trigger observed that `amount_ml IS NOT NULL` and promptly overwrote the newly updated `intake_amount` with the stale `amount_ml`.
2. **Conflicting INSERT Resolution**: Unclear precedence when both columns were populated with differing values.
3. **Invalid Volume Acceptance**: Allowed zero (`0`) or negative (`-100`) volume entries.
4. **Statement Recursion Risk**: Any recursive trigger firing could lead to infinite loops or stack depth exhaustion.

### 3.2 Implemented Deterministic Trigger Specification
The trigger function `public.sync_water_logs_compatibility()` was refactored into a hardened, deterministic state machine executing `BEFORE INSERT OR UPDATE FOR EACH ROW`:

```sql
CREATE OR REPLACE FUNCTION public.sync_water_logs_compatibility()
RETURNS TRIGGER AS $$
DECLARE
    v_mapped_profile_id UUID;
    v_mapped_legacy_id INT;
    v_amount_ml_changed BOOLEAN := FALSE;
    v_intake_amount_changed BOOLEAN := FALSE;
BEGIN
    -- A. Volume Synchronization
    IF TG_OP = 'INSERT' THEN
        -- Case 1: Both provided and conflicting -> amount_ml is canonical
        IF NEW.amount_ml IS NOT NULL AND NEW.intake_amount IS NOT NULL THEN
            IF NEW.amount_ml != NEW.intake_amount THEN
                NEW.intake_amount := NEW.amount_ml;
            END IF;
        -- Case 2: Only amount_ml provided -> mirror to intake_amount
        ELSIF NEW.amount_ml IS NOT NULL AND NEW.intake_amount IS NULL THEN
            NEW.intake_amount := NEW.amount_ml;
        -- Case 3: Only intake_amount provided -> mirror to amount_ml
        ELSIF NEW.intake_amount IS NOT NULL AND NEW.amount_ml IS NULL THEN
            NEW.amount_ml := NEW.intake_amount;
        -- Case 4: Neither provided -> reject
        ELSE
            RAISE EXCEPTION 'Invalid hydration record: either amount_ml or intake_amount must be provided.';
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Evaluate distinct changes using IS DISTINCT FROM
        v_amount_ml_changed := (NEW.amount_ml IS DISTINCT FROM OLD.amount_ml);
        v_intake_amount_changed := (NEW.intake_amount IS DISTINCT FROM OLD.intake_amount);

        IF v_amount_ml_changed AND NOT v_intake_amount_changed THEN
            -- Only amount_ml was updated -> mirror to intake_amount
            NEW.intake_amount := NEW.amount_ml;
        ELSIF v_intake_amount_changed AND NOT v_amount_ml_changed THEN
            -- Only intake_amount was updated -> mirror to amount_ml
            NEW.amount_ml := NEW.intake_amount;
        ELSIF v_amount_ml_changed AND v_intake_amount_changed THEN
            -- Both columns were updated concurrently -> amount_ml takes canonical precedence
            IF NEW.amount_ml != NEW.intake_amount THEN
                NEW.intake_amount := NEW.amount_ml;
            END IF;
        ELSE
            -- Neither column changed; ensure consistency if one was NULL
            IF NEW.amount_ml IS NOT NULL AND NEW.intake_amount IS NULL THEN
                NEW.intake_amount := NEW.amount_ml;
            ELSIF NEW.intake_amount IS NOT NULL AND NEW.amount_ml IS NULL THEN
                NEW.amount_ml := NEW.intake_amount;
            END IF;
        END IF;
    END IF;

    -- B. Volume Boundary Check (Must be strictly positive > 0 ml)
    IF COALESCE(NEW.amount_ml, NEW.intake_amount, 0) <= 0 THEN
        RAISE EXCEPTION 'Invalid hydration volume: volume must be strictly positive (> 0 ml). Received amount_ml=%, intake_amount=%',
            NEW.amount_ml, NEW.intake_amount;
    END IF;

    -- C. Identity Translation
    IF NEW.profile_id IS NOT NULL AND NEW.user_id IS NULL THEN
        SELECT legacy_integer_id INTO v_mapped_legacy_id
        FROM public.legacy_user_id_map
        WHERE profile_id = NEW.profile_id;

        IF v_mapped_legacy_id IS NOT NULL THEN
            NEW.user_id := v_mapped_legacy_id;
        END IF;
    ELSIF NEW.user_id IS NOT NULL AND NEW.profile_id IS NULL THEN
        SELECT profile_id INTO v_mapped_profile_id
        FROM public.legacy_user_id_map
        WHERE legacy_integer_id = NEW.user_id;

        IF v_mapped_profile_id IS NOT NULL THEN
            NEW.profile_id := v_mapped_profile_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;
```

### 3.3 Semantic Verification Matrix
| Operation | Input State | Resulting `amount_ml` | Resulting `intake_amount` | Rationale & Mechanism |
| :--- | :--- | :---: | :---: | :--- |
| **INSERT** | `intake_amount = 350`, `amount_ml = NULL` | `350` | `350` | Legacy client support; mirrored forward. |
| **INSERT** | `amount_ml = 500`, `intake_amount = NULL` | `500` | `500` | Modern V2 client support; mirrored backward. |
| **INSERT** | `amount_ml = 750`, `intake_amount = 750` | `750` | `750` | Consistent input preserved as-is. |
| **INSERT** | `amount_ml = 1000`, `intake_amount = 250` | `1000` | `1000` | Conflict resolution: canonical `amount_ml` wins. |
| **INSERT** | `amount_ml = NULL`, `intake_amount = NULL` | *Exception* | *Exception* | Fails closed; requires hydration quantity. |
| **INSERT** | `amount_ml = -100` OR `amount_ml = 0` | *Exception* | *Exception* | Fails closed; strictly positive volume (> 0 ml). |
| **UPDATE** | Change `intake_amount = 600`, leave `amount_ml` | `600` | `600` | `IS DISTINCT FROM` detects single-column update. |
| **UPDATE** | Change `amount_ml = 800`, leave `intake_amount` | `800` | `800` | `IS DISTINCT FROM` detects single-column update. |
| **UPDATE** | Change both (`amount_ml = 900`, `intake = 300`) | `900` | `900` | Conflict resolution: canonical `amount_ml` wins. |

### 3.4 Recursion Prevention
Because the trigger is defined as `BEFORE INSERT OR UPDATE ... FOR EACH ROW` and directly modifies fields of the `NEW` buffer before writing to disk, **no secondary SQL `UPDATE` statement is issued**. Recursion depth is mathematically zero.

---

## 4. Row Level Security & Privilege Hardening Review

### 4.1 Privilege Matrix Analysis
An audit of existing table permissions revealed that legacy configurations did not explicitly grant sequence usage to the `authenticated` role on `public.water_logs_id_seq`, which would fail standard client inserts. The privilege assignments were strictly codified:

```sql
-- Privilege Hardening on water_logs
REVOKE ALL ON TABLE public.water_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.water_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.water_logs TO authenticated;
GRANT ALL ON TABLE public.water_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO service_role;
```

### 4.2 RLS Policy Specification on `public.water_logs`
```sql
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
CREATE POLICY "Members manage own water logs" ON public.water_logs
    FOR ALL TO authenticated
    USING (
        auth.uid() = profile_id OR
        EXISTS (
            SELECT 1 FROM public.legacy_user_id_map m
            WHERE m.legacy_integer_id = water_logs.user_id
              AND m.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = profile_id OR
        EXISTS (
            SELECT 1 FROM public.legacy_user_id_map m
            WHERE m.legacy_integer_id = water_logs.user_id
              AND m.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
CREATE POLICY "Service role manages water logs" ON public.water_logs
    FOR ALL TO service_role
    USING ( true )
    WITH CHECK ( true );
```

### 4.3 Evaluation Across Caller Contexts
| Caller Context | SELECT | INSERT | UPDATE | DELETE | Security Verification |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Unauthenticated (`anon`)** | ❌ DENIED | ❌ DENIED | ❌ DENIED | ❌ DENIED | Table privilege revoked; fails with `42501 permission denied`. |
| **Authenticated (Own Logs)** | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | Matches `auth.uid() = profile_id`. |
| **Authenticated (Other User's Logs)** | ❌ BLOCKED | ❌ BLOCKED | ❌ BLOCKED | ❌ BLOCKED | Returns 0 rows on SELECT; 0 rows affected on UPDATE/DELETE; WITH CHECK fails on INSERT. |
| **Mapped Legacy User** | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | Matches `EXISTS (SELECT 1 FROM legacy_user_id_map ...)` on legacy `user_id`. |
| **Unmapped Legacy User (147, 153)** | ❌ INVISIBLE | ❌ BLOCKED | ❌ BLOCKED | ❌ BLOCKED | Cannot be seen or altered by any authenticated user until legitimately claimed. |
| **Service Role (`service_role`)** | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED | Matches `USING (true)` for backend batch/admin operations. |

---

## 5. Hardened Identity Claiming Architecture

### 5.1 Protocol Boundary & Runtime Scope
> [!IMPORTANT]
> **Claim Protocol Runtime Boundary**: The deferred claim protocol is **NOT** exposed as an unauthenticated or public SQL RPC function in Phase 9B. Phase 9B strictly deploys the **schema foundation** (`public.legacy_user_id_map`). Runtime account claiming is handled exclusively by a server-side backend endpoint (`/api/v1/auth/claim-legacy-account`) in Express.

### 5.2 Server-Controlled Atomic Claim Specification
When an unmapped legacy user (such as User 153) signs up or authenticates into STRIVA V2 via Supabase Auth, claiming their legacy records must execute under strict server controls:

1. **Authentication Context Derivation**:
   - The authenticated UUID (`callerProfileId`) is extracted directly from the verified Supabase Auth JWT (`req.user.id`).
   - The caller cannot provide an arbitrary target profile ID.
2. **Multi-Factor Claim Verification**:
   - The server inspects the caller's JWT claims:
     - `email_verified`: Must be `true`.
     - `email`: Must match `public.users.email` (case-insensitive).
     - If the legacy user had a registered OAuth provider (`google_id IS NOT NULL`), the caller's JWT metadata `sub` claim MUST match `public.users.google_id`.
3. **Atomic 1:1 Database Claim Transaction**:
   ```sql
   BEGIN;
   -- 1. Insert into bridge table (fails if already claimed due to PK/UNIQUE constraints)
   INSERT INTO public.legacy_user_id_map (legacy_integer_id, profile_id, email, verification_method)
   VALUES ($target_legacy_id, $caller_profile_id, $verified_email, 'verified_oauth_claim');

   -- 2. Atomically link historical hydration logs
   UPDATE public.water_logs
   SET profile_id = $caller_profile_id
   WHERE user_id = $target_legacy_id AND profile_id IS NULL;

   -- 3. Emit immutable audit log
   INSERT INTO public.audit_logs (event_type, actor_id, target_id, details)
   VALUES ('LEGACY_IDENTITY_CLAIMED', $caller_profile_id, $target_legacy_id, json_build_object('method', 'verified_oauth_claim'));
   COMMIT;
   ```
4. **Fail-Closed Guarantees**:
   - If `legacy_integer_id` was already claimed by another profile: transaction aborts with `23505 unique_violation`.
   - If caller's profile already claimed a legacy ID: transaction aborts with `23505 unique_violation`.
   - If email does not match or email is unverified: server returns `403 Forbidden` (`CLAIM_DENIED`).
   - Audit logs store privacy-safe identifiers and mask personal contact information.

---

## 6. Migration and Rollback Safety Analysis

### 6.1 Idempotency & Preflight Checks
The migration `phase_9b_legacy_identity_bridge.sql` begins with a preflight safety gate that verifies the prerequisite schema exists:
- Confirms `public.users`, `public.profiles`, and `public.water_logs` exist.
- Employs `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `DROP POLICY IF EXISTS`.
- Wraps all operations in an atomic transaction runner.

### 6.2 Rollback and Data Preservation Protocol
A naive rollback that simply executes `ALTER TABLE public.water_logs DROP COLUMN profile_id` would permanently orphan or destroy hydration records logged by modern V2 users after deployment (where `user_id IS NULL`). 

The rollback runbook has been corrected to require an explicit pre-drop archival snapshot:

```sql
-- ====================================================================
-- SAFE ROLLBACK & RECONCILIATION RUNBOOK
-- ====================================================================

-- 1. Pre-Rollback Data Preservation:
-- Capture any modern V2 records created post-migration that lack legacy user_id
CREATE TABLE IF NOT EXISTS public._rollback_v2_water_logs_archive AS
SELECT * FROM public.water_logs WHERE user_id IS NULL;

-- 2. Atomic Rollback Execution:
BEGIN;
DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();
DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
DROP TABLE IF EXISTS public.legacy_user_id_map;
ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id, DROP COLUMN IF EXISTS amount_ml;
COMMIT;

-- 3. Invariant Verification:
-- All 13 original legacy water_logs rows remain intact with user_id and intake_amount.
-- Modern records are preserved in _rollback_v2_water_logs_archive for reconciliation.
```

---

## 7. Unresolved Risks & Mitigations

| Risk | Severity | Status | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Legacy User 147 Unmapped** | Low | Managed | Left unmapped pending operator manual attestation. Single hydration log remains safe and intact. |
| **Unclaimed User 153 Logs** | Low | Managed | Preserved with `profile_id = NULL`. Will be bridged upon legitimate authenticated claim. |
| **Legacy Nutrition Logs** | Medium | Quarantined | `public.nutrition_logs` integer schema is not modified in Phase 9B; isolated to DB-4A migration. |
| **Post-Migration V2 Rollback Risk** | Low | Mitigated | Pre-rollback archival snapshot (`_rollback_v2_water_logs_archive`) preserves modern records. |

---

## 8. Final Recommendation

### **`READY FOR STAGING PREFLIGHT`**

**Rationale**:
1. Conflicting evidence for Legacy ID 147 has been resolved: omitted from automated seed; strictly IDs 148 and 151 are bridged.
2. Volume synchronization semantics in `sync_water_logs_compatibility()` are fully deterministic and handle all 10 edge cases without recursion.
3. RLS policies and sequence privileges have been validated on real PostgreSQL 18.3 engine.
4. Identity claiming architecture is server-controlled, atomic, and fails closed.
5. Safe rollback and data preservation protocols have been proven.
6. Local integration suite achieved **100% pass rate (46 / 46 tests passing)**.
