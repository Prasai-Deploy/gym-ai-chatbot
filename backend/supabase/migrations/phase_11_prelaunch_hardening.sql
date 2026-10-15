-- ====================================================================
-- STRIVA V2 - Phase 11 / DB-5: Pre-Launch Security & Catalog Hardening
-- DRAFT MIGRATION SPECIFICATION — NOT YET APPLIED TO DATABASE
--
-- Target Database: Supabase project ymrblyiwohvxptiqjfsi (Staging Baseline: 25 migrations)
-- Advisory Lock Key: 746291048201582
--
-- Approved Scope:
-- 1. Tenant Isolation: Drop fallback UUID default on public.profiles.organization_id.
-- 2. Atomic Demo Reset: Create public.reset_demo_account(target_user_id UUID).
-- 3. Routine Hardening:
--    - Pin public.handle_new_user() to search_path = pg_catalog, pg_temp; restrict grants.
--    - Pin public.is_org_member(UUID) to search_path = pg_catalog, pg_temp; revoke anon.
--    - Pin public.enforce_workout_session_state_transition() to search_path = pg_catalog, pg_temp.
--
-- Explicit Exclusions:
-- - B2B gym tier pricing and GST invoicing configuration (gated externally).
-- - Creation of blanket RLS policies on quarantined legacy tables.
--
-- TRANSACTION SAFETY & EXECUTION NOTE:
-- Migration runners (e.g. backend/scripts/apply_staging_migrations.js) wrap
-- individual migrations in BEGIN ... COMMIT with advisory lock 746291048201582.
-- When executing this script manually via psql or Supabase SQL editor, execute
-- within an explicit transaction block:
--   BEGIN;
--   SELECT pg_advisory_xact_lock(746291048201582);
--   ...
--   COMMIT;
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Tenant Isolation: Drop Hardcoded Fallback Default on profiles.organization_id
-- --------------------------------------------------------------------
-- AGENTS.md Rule 6: Fallback tenant UUID literals are strictly prohibited.
-- Unassigned tenant requests must fail closed with NULL.
ALTER TABLE public.profiles 
    ALTER COLUMN organization_id DROP DEFAULT;

-- Reconcile any existing unassigned profiles holding the fallback UUID
UPDATE public.profiles 
SET organization_id = NULL 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND id NOT IN (
    SELECT user_id FROM public.organization_members 
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  );

-- --------------------------------------------------------------------
-- 2. Atomic Demo Account Data Reset Stored Procedure
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_demo_account(target_user_id UUID)
RETURNS void AS $$
DECLARE
    v_demo_email TEXT;
    v_mapping_count INT;
    v_legacy_user_id INT;
BEGIN
    -- A. Input Validation & Fail-Closed Guard
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user ID must not be null';
    END IF;

    -- B. Verify Target Account Belongs Strictly to a Demo Account
    SELECT email INTO v_demo_email 
    FROM public.profiles 
    WHERE id = target_user_id;

    IF v_demo_email IS NULL THEN
        RAISE EXCEPTION 'Target user profile not found: %', target_user_id;
    END IF;

    IF LOWER(v_demo_email) <> 'demo@sweatfix.com' THEN
        RAISE EXCEPTION 'Security violation: reset_demo_account is restricted strictly to verified demo accounts (demo@sweatfix.com). Target email: %', v_demo_email;
    END IF;

    -- C. Dependency-Safe Atomic Deletion Sequence
    -- Step 1: Child exercise sets (must precede parent workout sessions)
    DELETE FROM public.exercise_sets 
    WHERE session_id IN (
        SELECT id FROM public.v2_workout_sessions WHERE user_id = target_user_id
    );

    -- Step 2: Modern V2 domain records (UUID-based predicates)
    DELETE FROM public.v2_workout_sessions WHERE user_id = target_user_id;
    DELETE FROM public.v2_workout_plans WHERE user_id = target_user_id;
    DELETE FROM public.v2_nutrition_logs WHERE user_id = target_user_id;

    -- Step 3: Resolve legacy integer identity via public.legacy_user_id_map
    -- Strict 1:1 integrity check: ensure at most one legacy ID maps to this profile
    SELECT COUNT(*), MAX(legacy_integer_id)
    INTO v_mapping_count, v_legacy_user_id
    FROM public.legacy_user_id_map
    WHERE profile_id = target_user_id;

    IF v_mapping_count > 1 THEN
        RAISE EXCEPTION 'Integrity violation: multiple legacy mappings found for target user %', target_user_id;
    END IF;

    -- Hydration cleanup: handles V2 profile_id and mapped legacy user_id
    DELETE FROM public.water_logs 
    WHERE profile_id = target_user_id 
       OR (v_legacy_user_id IS NOT NULL AND user_id = v_legacy_user_id);

    -- Step 4: Quarantined legacy tables strictly scoped to resolved legacy integer ID
    -- If no legacy mapping exists, skip legacy table deletions (preserves safe V2-only reset)
    IF v_legacy_user_id IS NOT NULL THEN
        DELETE FROM public.user_fitness_plans WHERE user_id = v_legacy_user_id;
        DELETE FROM public.chatbot_generated_plans WHERE user_id = v_legacy_user_id;
        DELETE FROM public.chatbot_generated_workouts WHERE user_id = v_legacy_user_id;
        DELETE FROM public.chatbot_generated_diets WHERE user_id = v_legacy_user_id;
        DELETE FROM public.workout_logs WHERE user_id = v_legacy_user_id;
        DELETE FROM public.workout_sessions WHERE user_id = v_legacy_user_id;
        DELETE FROM public.workout_plans WHERE user_id = v_legacy_user_id;
        DELETE FROM public.progress_logs WHERE user_id = v_legacy_user_id;
        DELETE FROM public.user_progress WHERE user_id = v_legacy_user_id;
        DELETE FROM public.user_meal_tracking WHERE user_id = v_legacy_user_id;
        DELETE FROM public.daily_plans WHERE user_id = v_legacy_user_id;
        DELETE FROM public.progress WHERE user_id = v_legacy_user_id;
    END IF;

    -- Intentionally Excluded:
    -- - public.profiles (preserves core demo identity record)
    -- - public.subscriptions (preserves permanent demo sandbox entitlement)
    -- - public.member_settings (preserves demo UI preferences)
    -- - Shared catalogs (exercises, equipment) & audit tables
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

COMMENT ON FUNCTION public.reset_demo_account(UUID) IS 
'STRIVA V2 atomic demo account data reset procedure executing inside a single ACID transaction block.';

-- Privilege Hardening: Restricted exclusively to backend service_role
REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_account(UUID) TO service_role;

-- --------------------------------------------------------------------
-- 3. Routine Hardening: public.handle_new_user()
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- 1. Identity, fitness profile, preferences, and settings provisioning
    -- All table references fully schema-qualified to public.*
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.v2_fitness_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_preferences (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.member_settings (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;

    -- 2. Subscription & Trial Provisioning
    IF NEW.email = 'demo@sweatfix.com' THEN
        INSERT INTO public.subscriptions (
            user_id, tier, interval, status, provider,
            trial_started_at, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (
            NEW.id, 'free', 'monthly', 'active', 'razorpay',
            NULL, NULL, NOW(), NOW() + INTERVAL '100 years', FALSE
        ) ON CONFLICT (user_id) DO NOTHING;
    ELSE
        INSERT INTO public.subscriptions (
            user_id, tier, interval, status, provider,
            trial_started_at, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (
            NEW.id, 'pro', 'monthly', 'trialing', 'razorpay',
            NOW(), NOW() + INTERVAL '14 days', NOW(), NOW() + INTERVAL '14 days', FALSE
        ) ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

COMMENT ON FUNCTION public.handle_new_user() IS 
'STRIVA V2 auth.users trigger routine hardened with immutable search_path and restricted routine execution privileges.';

-- Privilege Hardening: Revoke from public/anon/authenticated; grant to auth admin, service_role, and postgres
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role, postgres;

-- --------------------------------------------------------------------
-- 4. Routine Hardening: public.is_org_member(UUID)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL OR target_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = target_org_id
          AND om.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = target_org_id
          AND o.owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

COMMENT ON FUNCTION public.is_org_member(UUID) IS 
'STRIVA V2 canonical tenant membership helper hardened with search_path = pg_catalog, pg_temp and revoked anonymous execution.';

-- Privilege Hardening: Revoke from PUBLIC and anon; grant strictly to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO service_role;

-- --------------------------------------------------------------------
-- 5. Routine Hardening: public.enforce_workout_session_state_transition()
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
RETURNS trigger AS $$
BEGIN
    IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
        RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp;

COMMENT ON FUNCTION public.enforce_workout_session_state_transition() IS 
'STRIVA V2 workout session state transition trigger hardened with search_path = pg_catalog, pg_temp.';
