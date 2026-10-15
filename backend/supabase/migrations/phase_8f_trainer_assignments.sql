-- ====================================================================
-- STRIVA V2 - Phase 8F: Trainer Member Assignments Migration
-- Canonical organization-scoped assignment table between trainers and members
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.trainer_member_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    trainer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure a member has at most one active primary trainer assignment per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_member_trainer_assignment
    ON public.trainer_member_assignments (organization_id, member_user_id)
    WHERE status = 'active';

-- Performance indexes for trainer queries
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_org_trainer
    ON public.trainer_member_assignments (organization_id, trainer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_trainer_assignments_org_member
    ON public.trainer_member_assignments (organization_id, member_user_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trainer_member_assignments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members/Staff can view assignments within their organization
CREATE POLICY "View organization trainer assignments"
    ON public.trainer_member_assignments
    FOR SELECT
    USING (
        public.is_org_member(organization_id)
    );

-- Policy 2: Owners, Managers, and Platform Super Admins can manage assignments
CREATE POLICY "Manage organization trainer assignments"
    ON public.trainer_member_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = trainer_member_assignments.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = trainer_member_assignments.organization_id AND o.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = trainer_member_assignments.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = trainer_member_assignments.organization_id AND o.owner_id = auth.uid()
        )
    );
