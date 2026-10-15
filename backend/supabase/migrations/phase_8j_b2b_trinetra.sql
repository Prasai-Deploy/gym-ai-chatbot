-- ============================================================================
-- STRIVA V2 — PHASE 8J: B2B TRINETRA GYM BUSINESS INTELLIGENCE
-- Organization-scoped AI conversations and access control policies
-- ============================================================================

-- 1. EXTEND AI CONVERSATIONS TABLE FOR TENANT & SCOPE ISOLATION
DO $$
BEGIN
    -- Add organization_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_conversations' 
          AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.ai_conversations
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add scope column if not exists (default 'consumer', or 'organization_advisor')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_conversations' 
          AND column_name = 'scope'
    ) THEN
        ALTER TABLE public.ai_conversations
        ADD COLUMN scope TEXT DEFAULT 'consumer' CHECK (scope IN ('consumer', 'organization_advisor'));
    END IF;
END $$;

-- 2. CREATE PERFORMANCE & ISOLATION INDEXES
CREATE INDEX IF NOT EXISTS idx_ai_conversations_org_scope 
ON public.ai_conversations(organization_id, scope);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_org_scope 
ON public.ai_conversations(user_id, organization_id, scope);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_scope 
ON public.ai_conversations(scope);

-- 3. ENHANCE ROW LEVEL SECURITY (RLS) POLICIES
-- ai_conversations already has RLS enabled. We ensure distinct consumer & organization policies.

DO $$
BEGIN
    -- Recreate policy for consumer conversations
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_conversations' 
          AND policyname = 'Members manage own conversations'
    ) THEN
        DROP POLICY "Members manage own conversations" ON public.ai_conversations;
    END IF;

    -- Consumer conversations policy: User owns the conversation and scope is consumer
    CREATE POLICY "Users manage own consumer conversations" ON public.ai_conversations
        FOR ALL
        USING (
            auth.uid() = user_id AND (scope = 'consumer' OR scope IS NULL)
        )
        WITH CHECK (
            auth.uid() = user_id AND (scope = 'consumer' OR scope IS NULL)
        );

    -- Organization Advisor conversations policy:
    -- User owns conversation, organization_id is set, scope is 'organization_advisor',
    -- and user is an authorized member (Owner, Manager, Super Admin) of that organization.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_conversations' 
          AND policyname = 'Authorized staff manage organization advisor conversations'
    ) THEN
        CREATE POLICY "Authorized staff manage organization advisor conversations" ON public.ai_conversations
            FOR ALL
            USING (
                auth.uid() = user_id 
                AND scope = 'organization_advisor'
                AND organization_id IS NOT NULL
                AND (
                    EXISTS (
                        SELECT 1 FROM public.organization_members om
                        WHERE om.organization_id = ai_conversations.organization_id
                          AND om.user_id = auth.uid()
                          AND om.role IN ('Organization Owner', 'Gym Manager')
                    )
                    OR EXISTS (
                        SELECT 1 FROM public.organization_staff os
                        WHERE os.organization_id = ai_conversations.organization_id
                          AND os.user_id = auth.uid()
                          AND os.role_key IN ('owner', 'gym_manager', 'manager')
                    )
                    OR EXISTS (
                        SELECT 1 FROM auth.users u
                        WHERE u.id = auth.uid()
                          AND (u.raw_app_meta_data->>'role' = 'Platform Super Admin' OR u.raw_user_meta_data->>'role' = 'Platform Super Admin')
                    )
                )
            )
            WITH CHECK (
                auth.uid() = user_id 
                AND scope = 'organization_advisor'
                AND organization_id IS NOT NULL
            );
    END IF;
END $$;
