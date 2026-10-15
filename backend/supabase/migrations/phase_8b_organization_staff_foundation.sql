-- ====================================================================
-- STRIVA V2 - Phase 8B: Organization, Location & Staff Foundation Migration
-- Reconciles organizations.owner_id, establishes canonical organization_members,
-- hardens organization_invitations, and replaces obsolete current_setting RLS
-- policies with auth.uid() and is_org_member() security functions.
-- ====================================================================

-- 1. Ensure owner_id column exists on organizations table
ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- 2. Canonical organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Member',
    location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_organization_members_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON public.organization_members (organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_role ON public.organization_members (user_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON public.organization_members (organization_id, role);

-- Reconcile legacy organization_staff into canonical organization_members
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_staff') THEN
        INSERT INTO public.organization_members (organization_id, user_id, role, location_id)
        SELECT organization_id, user_id, COALESCE(role_key, 'Trainer'), location_id
        FROM public.organization_staff
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = EXCLUDED.role,
            location_id = EXCLUDED.location_id;
    END IF;
END $$;

-- 3. Hardening organization_invitations
ALTER TABLE public.organization_invitations
    ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org ON public.organization_invitations(organization_id);

-- Canonical Tenant Membership Helper Function
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

-- 4. Enable RLS on all organization foundation tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Drop obsolete current_setting policies from migration 008
DROP POLICY IF EXISTS "Tenant organization access policy" ON public.organizations;
DROP POLICY IF EXISTS "Tenant locations access policy" ON public.organization_locations;
DROP POLICY IF EXISTS "Tenant branding access policy" ON public.organization_branding;
DROP POLICY IF EXISTS "Tenant settings access policy" ON public.organization_settings;
DROP POLICY IF EXISTS "Tenant staff access policy" ON public.organization_staff;
DROP POLICY IF EXISTS "Tenant invitations access policy" ON public.organization_invitations;
DROP POLICY IF EXISTS "Tenant audit logs access policy" ON public.organization_audit_logs;

-- 6. Canonical Fail-Closed RLS Policies using is_org_member() and auth.uid()

-- Organizations
CREATE POLICY "Members view assigned organization" ON public.organizations
    FOR SELECT USING (
        public.is_org_member(id) OR owner_id = auth.uid()
    );

CREATE POLICY "Owners update organization" ON public.organizations
    FOR UPDATE USING (
        owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = id AND user_id = auth.uid() AND role IN ('Organization Owner', 'Platform Super Admin')
        )
    ) WITH CHECK (
        owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = id AND user_id = auth.uid() AND role IN ('Organization Owner', 'Platform Super Admin')
        )
    );

-- Organization Members
CREATE POLICY "Members view tenant memberships" ON public.organization_members
    FOR SELECT USING (
        public.is_org_member(organization_id)
    );

CREATE POLICY "Staff managers manage organization members" ON public.organization_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_members.organization_id AND o.owner_id = auth.uid()
        )
    );

-- Organization Locations
CREATE POLICY "Members view organization locations" ON public.organization_locations
    FOR SELECT USING (
        public.is_org_member(organization_id)
    );

CREATE POLICY "Managers manage organization locations" ON public.organization_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_locations.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_locations.organization_id AND o.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_locations.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_locations.organization_id AND o.owner_id = auth.uid()
        )
    );

-- Organization Branding
CREATE POLICY "Members view organization branding" ON public.organization_branding
    FOR SELECT USING (
        public.is_org_member(organization_id)
    );

CREATE POLICY "Managers update organization branding" ON public.organization_branding
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_branding.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_branding.organization_id AND o.owner_id = auth.uid()
        )
    );

-- Organization Settings
CREATE POLICY "Staff view organization settings" ON public.organization_settings
    FOR SELECT USING (
        public.is_org_member(organization_id)
    );

CREATE POLICY "Owners update organization settings" ON public.organization_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_settings.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_settings.organization_id AND o.owner_id = auth.uid()
        )
    );

-- Organization Invitations
CREATE POLICY "Staff view organization invitations" ON public.organization_invitations
    FOR SELECT USING (
        public.is_org_member(organization_id)
    );

CREATE POLICY "Managers manage organization invitations" ON public.organization_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_invitations.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_invitations.organization_id AND o.owner_id = auth.uid()
        )
    );

-- Organization Audit Logs
CREATE POLICY "Managers view organization audit logs" ON public.organization_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_audit_logs.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        ) OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_audit_logs.organization_id AND o.owner_id = auth.uid()
        )
    );

CREATE POLICY "System insert audit logs" ON public.organization_audit_logs
    FOR INSERT WITH CHECK (
        public.is_org_member(organization_id)
    );
