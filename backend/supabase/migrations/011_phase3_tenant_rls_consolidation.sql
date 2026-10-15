-- ====================================================================
-- STRIVA V2 - Phase 3 Database Consolidation & RLS Hardening
-- Multi-tenant isolation helper functions, canonical table RLS policies,
-- member-level security rules, and legacy ID compatibility mapping.
-- ====================================================================

-- 1. Helper Function: Get Authenticated User ID
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Helper Function: Check User Organization Membership
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Legacy Integer User ID Bridge Mapping Table
CREATE TABLE IF NOT EXISTS public.legacy_user_id_map (
    legacy_integer_id INT PRIMARY KEY,
    supabase_uuid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on mapping table
ALTER TABLE public.legacy_user_id_map ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read own legacy map' AND tablename = 'legacy_user_id_map') THEN
        CREATE POLICY "Read own legacy map" ON public.legacy_user_id_map
            FOR SELECT USING (auth.uid() = supabase_uuid);
    END IF;
END $$;

-- 4. Multi-Tenant RLS Policies Enforcement

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users access own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users access own profile" ON public.profiles
            FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gym staff view tenant member profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Gym staff view tenant member profiles" ON public.profiles
            FOR SELECT USING (
                organization_id IS NOT NULL AND public.is_org_member(organization_id)
            );
    END IF;
END $$;

-- Workout Plans
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members manage own workout plans' AND tablename = 'workout_plans') THEN
        CREATE POLICY "Members manage own workout plans" ON public.workout_plans
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant staff view organization workout plans' AND tablename = 'workout_plans') THEN
        CREATE POLICY "Tenant staff view organization workout plans" ON public.workout_plans
            FOR SELECT USING (
                organization_id IS NOT NULL AND public.is_org_member(organization_id)
            );
    END IF;
END $$;

-- Workout Sessions (v2_workout_sessions)
ALTER TABLE public.v2_workout_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members manage own workout sessions' AND tablename = 'v2_workout_sessions') THEN
        CREATE POLICY "Members manage own workout sessions" ON public.v2_workout_sessions
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Exercise Sets
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members manage own exercise sets' AND tablename = 'exercise_sets') THEN
        CREATE POLICY "Members manage own exercise sets" ON public.exercise_sets
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.v2_workout_sessions ws
                    WHERE ws.id = session_id AND ws.user_id = auth.uid()
                )
            ) WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.v2_workout_sessions ws
                    WHERE ws.id = session_id AND ws.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Nutrition Logs (v2_nutrition_logs)
ALTER TABLE public.v2_nutrition_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members manage own nutrition logs' AND tablename = 'v2_nutrition_logs') THEN
        CREATE POLICY "Members manage own nutrition logs" ON public.v2_nutrition_logs
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Water Logs
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members manage own water logs' AND tablename = 'water_logs') THEN
        CREATE POLICY "Members manage own water logs" ON public.water_logs
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Attendance Logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members view own attendance' AND tablename = 'attendance_logs') THEN
        CREATE POLICY "Members view own attendance" ON public.attendance_logs
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenant staff manage organization attendance' AND tablename = 'attendance_logs') THEN
        CREATE POLICY "Tenant staff manage organization attendance" ON public.attendance_logs
            FOR ALL USING (
                organization_id IS NOT NULL AND public.is_org_member(organization_id)
            ) WITH CHECK (
                organization_id IS NOT NULL AND public.is_org_member(organization_id)
            );
    END IF;
END $$;

-- 5. Performance Indexes on Tenant & User Keys
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_org_user ON public.workout_plans(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_user ON public.v2_workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session ON public.exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_user ON public.v2_nutrition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_user ON public.water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_org_user ON public.attendance_logs(organization_id, user_id);
