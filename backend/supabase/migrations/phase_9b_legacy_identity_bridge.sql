-- ====================================================================
-- STRIVA V2 - Phase 9B: Legacy-to-UUID Identity Bridge Foundation
-- DB-3B: Security-Hardened Additive Identity Bridge & Hydration Dual-Key Adaptation
--
-- Architecture & Invariants:
-- 1. Creates public.legacy_user_id_map as the canonical bridge between
--    legacy serial integer IDs (public.users.id) and modern UUIDs (public.profiles.id).
-- 2. Enforces strict 1:1 constraints:
--    - PRIMARY KEY on legacy_integer_id prevents one legacy ID from mapping to multiple profiles.
--    - UNIQUE on profile_id prevents one profile from claiming multiple legacy IDs.
--    - ON DELETE RESTRICT on legacy_integer_id prevents accidental cascading deletion of legacy users.
--    - ON DELETE CASCADE on profile_id cleans up mapping when Supabase Auth profile is deleted.
-- 3. Strict Evidence Corroboration:
--    - Populates ONLY the two dual-factor verified mappings: Legacy IDs 148 and 151
--      (verified by Google OAuth sub ID match AND case-insensitive email match).
--    - OMITTED: Legacy ID 147 is omitted from automated migration seed because email
--      alone is inconclusive; it is marked pending manual operator attestation.
--    - OMITTED: Legacy IDs 149, 150, 152, and 153 remain completely unmapped;
--      no guessed or unverified UUIDs are inserted.
-- 4. Additively adapts public.water_logs:
--    - Adds nullable profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL.
--    - Adds nullable amount_ml INT.
--    - Relaxes legacy NOT NULL constraint on user_id to permit modern V2 users to log hydration.
--    - Backfills amount_ml = intake_amount across all 13 historical rows.
--    - Preserves User 153's 12 historical rows with profile_id = NULL.
--    - Retains User 147's 1 row with profile_id = NULL pending manual verification.
-- 5. Deterministic Volume Synchronization Trigger (sync_water_logs_compatibility):
--    - INSERT:
--      * If only intake_amount: amount_ml := intake_amount
--      * If only amount_ml: intake_amount := amount_ml
--      * If both match: accepted
--      * If conflicting: amount_ml takes precedence, intake_amount := amount_ml
--    - UPDATE:
--      * Uses IS DISTINCT FROM to detect which column actually changed
--      * Prevents stale compatibility values from overwriting newer updates
--      * If both changed and conflict: amount_ml takes precedence
--    - Validation: Rejects NULL volumes or volumes <= 0 ml.
--    - Zero statement recursion: modifies NEW buffer in-place BEFORE write.
--    - Identity translation: bridges profile_id <-> legacy user_id via legacy_user_id_map.
-- 6. Row Level Security on water_logs and legacy_user_id_map:
--    - Replaces legacy open policies; grants strictly to authenticated and service_role.
--    - Revokes all access from public and anon.
-- 7. Additive and forward-only; zero data deletion.
--
-- ROLLBACK & RECONCILIATION RUNBOOK:
-- CAUTION: If post-migration V2 records were created with user_id IS NULL, dropping
-- profile_id will sever their identity association. An archival export must be taken:
--   CREATE TABLE public._rollback_v2_water_logs_archive AS
--   SELECT * FROM public.water_logs WHERE user_id IS NULL;
-- Then execute within an atomic transaction:
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
--   DROP FUNCTION IF EXISTS public.sync_water_logs_compatibility();
--   DROP POLICY IF EXISTS "Members manage own water logs" ON public.water_logs;
--   DROP POLICY IF EXISTS "Service role manages water logs" ON public.water_logs;
--   DROP TABLE IF EXISTS public.legacy_user_id_map;
--   ALTER TABLE public.water_logs DROP COLUMN IF EXISTS profile_id, DROP COLUMN IF EXISTS amount_ml;
--   COMMIT;
-- Note: All 13 original water_logs rows remain intact with user_id and intake_amount.
-- ====================================================================

-- 1. Preflight Safety Gate: Verify target schema prerequisites
DO $$
BEGIN
    -- Verify public.users table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'users'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.users table does not exist.';
    END IF;

    -- Verify public.profiles table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.profiles table does not exist.';
    END IF;

    -- Verify public.water_logs table exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'water_logs'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.water_logs table does not exist.';
    END IF;
END $$;

-- 2. Canonical Identity Bridge Table
CREATE TABLE IF NOT EXISTS public.legacy_user_id_map (
    legacy_integer_id INT PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    verification_method TEXT NOT NULL DEFAULT 'oauth_sub_and_email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.legacy_user_id_map IS 
'STRIVA V2 canonical identity bridge mapping legacy integer user IDs to modern Supabase Auth UUID profiles.';

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_legacy_user_map_profile ON public.legacy_user_id_map(profile_id);
CREATE INDEX IF NOT EXISTS idx_legacy_user_map_email ON public.legacy_user_id_map(LOWER(email));

-- 3. Row-Level Security on legacy_user_id_map
ALTER TABLE public.legacy_user_id_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own legacy mapping" ON public.legacy_user_id_map;
CREATE POLICY "Users view own legacy mapping" ON public.legacy_user_id_map
    FOR SELECT TO authenticated
    USING ( auth.uid() = profile_id );

DROP POLICY IF EXISTS "Service role manages legacy mapping" ON public.legacy_user_id_map;
CREATE POLICY "Service role manages legacy mapping" ON public.legacy_user_id_map
    FOR ALL TO service_role
    USING ( true )
    WITH CHECK ( true );

-- Privilege Hardening
REVOKE ALL ON TABLE public.legacy_user_id_map FROM PUBLIC;
REVOKE ALL ON TABLE public.legacy_user_id_map FROM anon;
GRANT SELECT ON TABLE public.legacy_user_id_map TO authenticated;
GRANT ALL ON TABLE public.legacy_user_id_map TO service_role;

-- 4. Populate Deterministic Verified Mappings
-- ONLY Legacy IDs 148 & 151: Verified by Google OAuth Subject ID match AND case-insensitive email match.
-- Legacy ID 147 is explicitly OMITTED due to lacking secondary trusted corroboration (email match alone is inconclusive).
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

-- 5. Additive Schema Adaptation on public.water_logs
ALTER TABLE public.water_logs 
    ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS amount_ml INT;

-- Relax legacy NOT NULL constraint on user_id to permit net-new V2 users to log water
ALTER TABLE public.water_logs 
    ALTER COLUMN user_id DROP NOT NULL;

-- Supporting Indexes for Hydration
CREATE INDEX IF NOT EXISTS idx_water_logs_profile_id ON public.water_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_created_at ON public.water_logs(created_at);

-- 6. Backfill Existing Hydration Data
-- Sync amount_ml from legacy intake_amount for all existing rows
UPDATE public.water_logs
SET amount_ml = intake_amount
WHERE amount_ml IS NULL AND intake_amount IS NOT NULL;

-- Backfill profile_id strictly for verified mapped users in legacy_user_id_map (User 148, 151)
UPDATE public.water_logs w
SET profile_id = m.profile_id
FROM public.legacy_user_id_map m
WHERE w.user_id = m.legacy_integer_id
  AND w.profile_id IS NULL;

-- 7. Deterministic Volume & Identity Synchronization Trigger
CREATE OR REPLACE FUNCTION public.sync_water_logs_compatibility()
RETURNS TRIGGER AS $$
DECLARE
    v_mapped_profile_id UUID;
    v_mapped_legacy_id INT;
    v_amount_changed BOOLEAN;
    v_intake_changed BOOLEAN;
BEGIN
    -- A. Input Validation
    IF TG_OP = 'INSERT' THEN
        IF NEW.amount_ml IS NULL AND NEW.intake_amount IS NULL THEN
            RAISE EXCEPTION 'Invalid hydration log: either amount_ml or intake_amount must be provided.';
        END IF;
    END IF;

    -- B. Volume Synchronization Logic
    IF TG_OP = 'INSERT' THEN
        IF NEW.amount_ml IS NOT NULL AND NEW.intake_amount IS NOT NULL THEN
            -- Both supplied: amount_ml (V2 canonical) takes precedence if conflicting
            IF NEW.amount_ml != NEW.intake_amount THEN
                NEW.intake_amount := NEW.amount_ml;
            END IF;
        ELSIF NEW.amount_ml IS NOT NULL THEN
            NEW.intake_amount := NEW.amount_ml;
        ELSIF NEW.intake_amount IS NOT NULL THEN
            NEW.amount_ml := NEW.intake_amount;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        v_amount_changed := (NEW.amount_ml IS DISTINCT FROM OLD.amount_ml);
        v_intake_changed := (NEW.intake_amount IS DISTINCT FROM OLD.intake_amount);

        IF v_amount_changed AND v_intake_changed THEN
            -- Both columns updated: amount_ml takes precedence if conflicting
            IF NEW.amount_ml IS NOT NULL AND (NEW.intake_amount IS NULL OR NEW.amount_ml != NEW.intake_amount) THEN
                NEW.intake_amount := NEW.amount_ml;
            ELSIF NEW.amount_ml IS NULL AND NEW.intake_amount IS NOT NULL THEN
                NEW.amount_ml := NEW.intake_amount;
            END IF;
        ELSIF v_amount_changed THEN
            -- Only amount_ml updated: mirror to intake_amount, preventing stale intake_amount from prevailing
            IF NEW.amount_ml IS NOT NULL THEN
                NEW.intake_amount := NEW.amount_ml;
            END IF;
        ELSIF v_intake_changed THEN
            -- Only intake_amount updated: mirror to amount_ml
            IF NEW.intake_amount IS NOT NULL THEN
                NEW.amount_ml := NEW.intake_amount;
            END IF;
        END IF;
    END IF;

    -- Volume Boundary Check (Must be strictly positive)
    IF COALESCE(NEW.amount_ml, NEW.intake_amount, 0) <= 0 THEN
        RAISE EXCEPTION 'Invalid hydration volume: volume must be strictly positive (> 0 ml). Received amount_ml=%, intake_amount=%',
            NEW.amount_ml, NEW.intake_amount;
    END IF;

    -- C. Identity Translation
    -- When profile_id is provided but user_id is missing: lookup legacy mapping
    IF NEW.profile_id IS NOT NULL AND NEW.user_id IS NULL THEN
        SELECT legacy_integer_id INTO v_mapped_legacy_id
        FROM public.legacy_user_id_map
        WHERE profile_id = NEW.profile_id;

        IF v_mapped_legacy_id IS NOT NULL THEN
            NEW.user_id := v_mapped_legacy_id;
        END IF;
    -- When user_id is provided but profile_id is missing: lookup profile mapping
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

COMMENT ON FUNCTION public.sync_water_logs_compatibility() IS 
'STRIVA V2 transitional compatibility trigger that deterministically synchronizes amount_ml/intake_amount and bridges profile_id/user_id.';

DROP TRIGGER IF EXISTS trg_sync_water_logs_compatibility ON public.water_logs;
CREATE TRIGGER trg_sync_water_logs_compatibility
    BEFORE INSERT OR UPDATE ON public.water_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_water_logs_compatibility();

-- 8. Row-Level Security on public.water_logs
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

-- Privilege Hardening on water_logs
REVOKE ALL ON TABLE public.water_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.water_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.water_logs TO authenticated;
GRANT ALL ON TABLE public.water_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.water_logs_id_seq TO service_role;

-- 9. Post-Migration Assertion Gate
DO $$
DECLARE
    v_map_count INT;
    v_water_count INT;
    v_null_amount_count INT;
    v_unmapped_153_count INT;
    v_unmapped_147_count INT;
BEGIN
    -- Verify mapping table contains exactly 2 verified rows (IDs 148 and 151)
    SELECT COUNT(*) INTO v_map_count FROM public.legacy_user_id_map;
    IF v_map_count != 2 THEN
        RAISE EXCEPTION 'Assertion failed: legacy_user_id_map has % mapped rows (expected exactly 2: IDs 148 and 151).', v_map_count;
    END IF;

    -- Verify zero hydration data was deleted
    SELECT COUNT(*) INTO v_water_count FROM public.water_logs;
    IF v_water_count < 13 THEN
        RAISE EXCEPTION 'Assertion failed: water_logs count dropped to % (expected >= 13). Data loss detected!', v_water_count;
    END IF;

    -- Verify amount_ml is populated across all rows
    SELECT COUNT(*) INTO v_null_amount_count FROM public.water_logs WHERE amount_ml IS NULL;
    IF v_null_amount_count > 0 THEN
        RAISE EXCEPTION 'Assertion failed: % water_logs rows have NULL amount_ml.', v_null_amount_count;
    END IF;

    -- Verify User 153 retains all 12 unmapped rows
    SELECT COUNT(*) INTO v_unmapped_153_count FROM public.water_logs WHERE user_id = 153 AND profile_id IS NULL;
    IF v_unmapped_153_count != 12 THEN
        RAISE EXCEPTION 'Assertion failed: User 153 unmapped rows is % (expected exactly 12).', v_unmapped_153_count;
    END IF;

    -- Verify User 147 remains unmapped (profile_id IS NULL) pending manual operator attestation
    SELECT COUNT(*) INTO v_unmapped_147_count FROM public.water_logs WHERE user_id = 147 AND profile_id IS NULL;
    IF v_unmapped_147_count != 1 THEN
        RAISE EXCEPTION 'Assertion failed: User 147 unmapped rows is % (expected exactly 1).', v_unmapped_147_count;
    END IF;
END $$;
