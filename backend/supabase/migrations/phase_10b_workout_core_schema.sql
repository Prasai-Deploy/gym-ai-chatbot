-- ====================================================================
-- STRIVA V2 - Phase 10B: Workout Domain Core Schema Migration
-- DB-4B Canonical Implementation: Additive Modern Workout Execution Infrastructure
--
-- Architecture & Invariants:
-- 1. Introduces public.v2_workout_plans with UUID PK, UUID user_id referencing
--    public.profiles(id), optional organization_id, and JSONB schedule routines.
-- 2. Introduces public.v2_workout_sessions supporting canonical execution lifecycle
--    (planned, ready, started, paused, completed, abandoned, cancelled).
-- 3. Enforces strict single-active session invariant per member via partial unique
--    index on state IN ('started', 'paused').
-- 4. Introduces public.exercise_sets linked directly to v2_workout_sessions(id)
--    with ON DELETE CASCADE and public.exercises(id) with ON DELETE SET NULL
--    (preserving historical performance data if catalog entries change).
-- 5. Preserves all legacy workout tables completely untouched.
-- 6. Strict fail-closed RLS policies with tenant isolation support.
-- ====================================================================

-- 1. Preflight Safety Gate: Verify target schema prerequisites
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.profiles table does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'organizations'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.organizations table does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'exercises'
    ) THEN
        RAISE EXCEPTION 'Preflight verification failed: public.exercises table does not exist.';
    END IF;
END $$;

-- 2. Canonical V2 Workout Plans Table
CREATE TABLE IF NOT EXISTS public.v2_workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Workout Plan' CHECK (char_length(trim(title)) >= 1),
    description TEXT,
    schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_workout_plans_user 
    ON public.v2_workout_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_v2_workout_plans_org 
    ON public.v2_workout_plans(organization_id);

-- 3. Canonical V2 Workout Sessions Table
CREATE TABLE IF NOT EXISTS public.v2_workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.v2_workout_plans(id) ON DELETE SET NULL,
    day_id VARCHAR(64),
    title VARCHAR(255) NOT NULL DEFAULT 'Workout Session' CHECK (char_length(trim(title)) >= 1),
    state VARCHAR(32) NOT NULL DEFAULT 'started'
        CHECK (state IN ('planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_user_state 
    ON public.v2_workout_sessions(user_id, state);
CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_started 
    ON public.v2_workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_org 
    ON public.v2_workout_sessions(organization_id);

-- Concurrency Safety: Limit each user to exactly one active (started or paused) session
CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_workout_sessions_single_active
    ON public.v2_workout_sessions(user_id)
    WHERE state IN ('started', 'paused');

-- State Transition Integrity: Enforce at database engine level that terminal sessions cannot be reopened
CREATE OR REPLACE FUNCTION public.enforce_workout_session_state_transition()
RETURNS trigger AS $$
BEGIN
    IF OLD.state IN ('completed', 'abandoned', 'cancelled') AND NEW.state <> OLD.state THEN
        RAISE EXCEPTION 'Invalid workout session transition: terminal state "%" cannot be transitioned to "%".', OLD.state, NEW.state;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_workout_session_state_transition ON public.v2_workout_sessions;
CREATE TRIGGER trg_enforce_workout_session_state_transition
    BEFORE UPDATE OF state ON public.v2_workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_workout_session_state_transition();

-- 4. Canonical Exercise Sets Table
CREATE TABLE IF NOT EXISTS public.exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.v2_workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    set_number INTEGER NOT NULL DEFAULT 1 CHECK (set_number >= 1),
    weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (weight_kg >= 0.00 AND weight_kg <= 1000.00),
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0 AND reps <= 1000),
    rpe NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1.0 AND rpe <= 10.0)),
    tempo VARCHAR(32),
    rest_time_seconds INTEGER CHECK (rest_time_seconds IS NULL OR rest_time_seconds >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'completed' 
        CHECK (status IN ('planned', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_session 
    ON public.exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise 
    ON public.exercise_sets(exercise_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.v2_workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- 6. Canonical Fail-Closed RLS Security Policies

-- A. v2_workout_plans Policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_plans' AND policyname = 'v2_workout_plans_member_select'
    ) THEN
        CREATE POLICY "v2_workout_plans_member_select" ON public.v2_workout_plans
            FOR SELECT TO authenticated
            USING (
                auth.uid() = user_id 
                OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_plans' AND policyname = 'v2_workout_plans_member_insert'
    ) THEN
        CREATE POLICY "v2_workout_plans_member_insert" ON public.v2_workout_plans
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_plans' AND policyname = 'v2_workout_plans_member_update'
    ) THEN
        CREATE POLICY "v2_workout_plans_member_update" ON public.v2_workout_plans
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_plans' AND policyname = 'v2_workout_plans_member_delete'
    ) THEN
        CREATE POLICY "v2_workout_plans_member_delete" ON public.v2_workout_plans
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- B. v2_workout_sessions Policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_sessions' AND policyname = 'v2_workout_sessions_member_select'
    ) THEN
        CREATE POLICY "v2_workout_sessions_member_select" ON public.v2_workout_sessions
            FOR SELECT TO authenticated
            USING (
                auth.uid() = user_id 
                OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_sessions' AND policyname = 'v2_workout_sessions_member_insert'
    ) THEN
        CREATE POLICY "v2_workout_sessions_member_insert" ON public.v2_workout_sessions
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_sessions' AND policyname = 'v2_workout_sessions_member_update'
    ) THEN
        CREATE POLICY "v2_workout_sessions_member_update" ON public.v2_workout_sessions
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_workout_sessions' AND policyname = 'v2_workout_sessions_member_delete'
    ) THEN
        CREATE POLICY "v2_workout_sessions_member_delete" ON public.v2_workout_sessions
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- C. exercise_sets Policies (Session Scoping)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'exercise_sets' AND policyname = 'exercise_sets_session_scope'
    ) THEN
        CREATE POLICY "exercise_sets_session_scope" ON public.exercise_sets
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.v2_workout_sessions ws
                    WHERE ws.id = exercise_sets.session_id 
                      AND (
                          ws.user_id = auth.uid()
                          OR (ws.organization_id IS NOT NULL AND public.is_org_member(ws.organization_id))
                      )
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.v2_workout_sessions ws
                    WHERE ws.id = exercise_sets.session_id 
                      AND ws.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 7. Principle of Least Privilege Grants
REVOKE ALL ON TABLE public.v2_workout_plans FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.v2_workout_sessions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.exercise_sets FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.v2_workout_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.v2_workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exercise_sets TO authenticated;

GRANT ALL ON TABLE public.v2_workout_plans TO service_role;
GRANT ALL ON TABLE public.v2_workout_sessions TO service_role;
GRANT ALL ON TABLE public.exercise_sets TO service_role;
