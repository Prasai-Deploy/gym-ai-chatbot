-- ====================================================================
-- STRIVA V2 - Phase 8D: Gym Owner Member Management Migration
-- Performance indexes for organization member queries and foreign key
-- alignment between organization_members and public.profiles.
-- ====================================================================

-- 1. Ensure foreign key constraint from organization_members(user_id) to public.profiles(id)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_org_members_profile'
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT fk_org_members_profile
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Performance indexes for member directory filtering and pagination
CREATE INDEX IF NOT EXISTS idx_org_members_org_status 
    ON public.organization_members (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_org_members_org_created 
    ON public.organization_members (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_members_org_role_created 
    ON public.organization_members (organization_id, role, created_at DESC);

-- 3. Confirm RLS policy on organization_members
-- Ensures tenant isolation at PostgreSQL level
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
