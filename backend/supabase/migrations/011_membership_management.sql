-- STRIVA membership management tables used by the admin API.

CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price INTEGER NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_org_active
    ON public.membership_plans (organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_memberships_org_status
    ON public.user_memberships (organization_id, status);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant membership plan access policy"
    ON public.membership_plans FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant user membership access policy"
    ON public.user_memberships FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);
