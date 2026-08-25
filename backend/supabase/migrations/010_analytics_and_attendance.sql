-- ====================================================================
-- STRIVA v4 - Sprint 5A.4 Analytics & Attendance Foundation Migration
-- Additive migration introducing attendance_logs table, multi-tenant
-- check-in tracking, and analytics performance indexes.
-- ====================================================================

-- 1. ATTENDANCE LOGS TABLE
-- Tracks member gym check-ins, visits, duration, and turnstile activity.
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    duration_minutes INT,
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'completed', 'active', 'no_show', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PERFORMANCE INDEXES FOR ANALYTICS QUERIES
CREATE INDEX IF NOT EXISTS idx_attendance_logs_org_checkin 
    ON public.attendance_logs (organization_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_user 
    ON public.attendance_logs (user_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_profiles_org_created 
    ON public.profiles (organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_created 
    ON public.subscriptions (status, created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status 
    ON public.invoices (user_id, status, paid_at);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_time 
    ON public.workout_sessions (user_id, started_at, state);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date 
    ON public.nutrition_logs (user_id, date);

CREATE INDEX IF NOT EXISTS idx_recovery_logs_user_date 
    ON public.recovery_logs (user_id, date);

CREATE INDEX IF NOT EXISTS idx_organization_staff_org_role 
    ON public.organization_staff (organization_id, role_key);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- 4. FAIL-CLOSED MULTI-TENANT RLS POLICIES (NO STATIC FALLBACK)
CREATE POLICY "Tenant attendance logs access policy"
    ON public.attendance_logs FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);
