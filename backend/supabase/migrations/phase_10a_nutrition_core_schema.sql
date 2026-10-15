-- ====================================================================
-- STRIVA V2 - Phase 10A: Nutrition Domain Core Schema Migration
-- DB-4B Canonical Implementation: Additive Modern Nutrition Infrastructure
--
-- Architecture & Invariants:
-- 1. Introduces public.v2_nutrition_logs with UUID PK and UUID user_id
--    referencing public.profiles(id) ON DELETE CASCADE.
-- 2. Explicitly permits multiple meal logs per user per day.
--    NO daily uniqueness constraint (UNIQUE (user_id, date)) is created.
-- 3. Macro fields enforced with NUMERIC(6,2) precision (up to 9999.99g)
--    and non-negative check constraints.
-- 4. Exposes public.v2_daily_nutrition_summary with (security_invoker = true)
--    so that queries through the view inherit underlying RLS policies.
-- 5. Strict fail-closed RLS policies for authenticated members and service_role.
-- 6. Additive and forward-only; zero mutation to legacy nutrition tables.
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
END $$;

-- 2. Canonical V2 Nutrition Logs Table
CREATE TABLE IF NOT EXISTS public.v2_nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type VARCHAR(32) NOT NULL DEFAULT 'snack' 
        CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name TEXT NOT NULL CHECK (char_length(trim(food_name)) >= 1),
    calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0 AND calories <= 20000),
    protein_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (protein_g >= 0.00 AND protein_g <= 1000.00),
    carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (carbs_g >= 0.00 AND carbs_g <= 1000.00),
    fats_g NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (fats_g >= 0.00 AND fats_g <= 1000.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes for Daily Summary and Timeline Queries
CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_user_date 
    ON public.v2_nutrition_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_v2_nutrition_logs_user_created 
    ON public.v2_nutrition_logs(user_id, created_at DESC);

-- 3. Canonical Daily Nutrition Summary View
-- WITH (security_invoker = true) guarantees PostgreSQL 15+ evaluates underlying RLS
CREATE OR REPLACE VIEW public.v2_daily_nutrition_summary 
WITH (security_invoker = true) AS
SELECT 
    user_id,
    date,
    SUM(calories)::INTEGER AS total_calories,
    ROUND(SUM(protein_g), 2)::NUMERIC(8,2) AS total_protein_g,
    ROUND(SUM(carbs_g), 2)::NUMERIC(8,2) AS total_carbs_g,
    ROUND(SUM(fats_g), 2)::NUMERIC(8,2) AS total_fats_g,
    COUNT(id)::INTEGER AS meal_count,
    MIN(created_at) AS first_logged_at,
    MAX(created_at) AS last_logged_at
FROM public.v2_nutrition_logs
GROUP BY user_id, date;

COMMENT ON VIEW public.v2_daily_nutrition_summary IS 
'STRIVA V2 Security-invoking aggregation view summarizing daily calorie and macro intake without imposing single-row uniqueness on meal logging.';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.v2_nutrition_logs ENABLE ROW LEVEL SECURITY;

-- 5. Canonical Fail-Closed RLS Security Policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_nutrition_logs' AND policyname = 'v2_nutrition_member_select'
    ) THEN
        CREATE POLICY "v2_nutrition_member_select" ON public.v2_nutrition_logs
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_nutrition_logs' AND policyname = 'v2_nutrition_member_insert'
    ) THEN
        CREATE POLICY "v2_nutrition_member_insert" ON public.v2_nutrition_logs
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_nutrition_logs' AND policyname = 'v2_nutrition_member_update'
    ) THEN
        CREATE POLICY "v2_nutrition_member_update" ON public.v2_nutrition_logs
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'v2_nutrition_logs' AND policyname = 'v2_nutrition_member_delete'
    ) THEN
        CREATE POLICY "v2_nutrition_member_delete" ON public.v2_nutrition_logs
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Principle of Least Privilege Grants
REVOKE ALL ON TABLE public.v2_nutrition_logs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.v2_daily_nutrition_summary FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.v2_nutrition_logs TO authenticated;
GRANT SELECT ON TABLE public.v2_daily_nutrition_summary TO authenticated;
GRANT ALL ON TABLE public.v2_nutrition_logs TO service_role;
GRANT ALL ON TABLE public.v2_daily_nutrition_summary TO service_role;
