-- ====================================================================
-- STRIVA v4 - Sprint 2F Multi-Tenant SaaS Foundation Migration
-- Additive migration introducing canonical organization domain tables,
-- multi-location support, white-label branding, RBAC permissions,
-- audit logs, and organization RLS security policies.
-- ====================================================================

-- 1. Organizations Master Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Enterprise Organization (Strangler Pattern for backward compatibility)
INSERT INTO public.organizations (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'STRIVA Default Enterprise', 'striva-default', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Organization Locations
CREATE TABLE IF NOT EXISTS public.organization_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Primary Location
INSERT INTO public.organization_locations (id, organization_id, name, is_primary)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Facility Headquarters', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Organization Branding (White Label)
CREATE TABLE IF NOT EXISTS public.organization_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    logo_url TEXT,
    primary_color VARCHAR(50) DEFAULT '#F97316',
    secondary_color VARCHAR(50) DEFAULT '#6366F1',
    business_name VARCHAR(255) NOT NULL,
    theme_mode VARCHAR(20) DEFAULT 'dark',
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    country VARCHAR(100) DEFAULT 'USA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Organization Settings
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    max_locations INT DEFAULT 5,
    allow_guest_passes BOOLEAN DEFAULT TRUE,
    require_2fa BOOLEAN DEFAULT FALSE,
    auto_dunning_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Canonical Roles & Permissions
CREATE TABLE IF NOT EXISTS public.organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role_key VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key VARCHAR(50) NOT NULL,
    permission_key VARCHAR(100) NOT NULL
);

-- 6. Staff Roster & Role Assignments
CREATE TABLE IF NOT EXISTS public.organization_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.organization_locations(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    role_key VARCHAR(50) NOT NULL DEFAULT 'Trainer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Invitations Domain
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role_key VARCHAR(50) NOT NULL DEFAULT 'Member',
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS public.organization_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Additive organization_id columns on tenant-owned tables (Strangler Pattern)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Organization RLS Security Policies (Fail-Closed: NO ORGANIZATION CONTEXT = NO TENANT DATA ACCESS)
CREATE POLICY "Tenant organization access policy"
    ON public.organizations FOR ALL
    USING (id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant locations access policy"
    ON public.organization_locations FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant branding access policy"
    ON public.organization_branding FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant settings access policy"
    ON public.organization_settings FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant roles access policy"
    ON public.organization_roles FOR ALL
    USING (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant permissions access policy"
    ON public.organization_permissions FOR SELECT
    USING (true);

CREATE POLICY "Tenant staff access policy"
    ON public.organization_staff FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant invitations access policy"
    ON public.organization_invitations FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant audit logs access policy"
    ON public.organization_audit_logs FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);
