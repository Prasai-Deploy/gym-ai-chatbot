-- ====================================================================
-- STRIVA v4 - Sprint 5A.3 Persistent AI Memory & AI Usage Analytics
-- Additive migration introducing persistent AI memory and real AI
-- usage analytics tables with fail-closed multi-tenant RLS policies.
-- ====================================================================

-- 1. AI AGENT MEMORIES TABLE
-- Stores long-term memory for AI agents per user, organization, and agent.
CREATE TABLE IF NOT EXISTS public.ai_agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_agent_memories_key UNIQUE (user_id, organization_id, agent_id, memory_key)
);

-- Indexes for AI memory lookup patterns
CREATE INDEX IF NOT EXISTS idx_ai_agent_memories_lookup 
    ON public.ai_agent_memories (user_id, organization_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_memories_expires 
    ON public.ai_agent_memories (expires_at);

-- 2. AI USAGE ANALYTICS TABLE
-- Stores persistent audit and billing/token metrics for every AI invocation.
CREATE TABLE IF NOT EXISTS public.ai_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    session_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INT NOT NULL DEFAULT 0,
    prompt_tokens INT,
    completion_tokens INT,
    total_tokens INT,
    tool_calls_count INT NOT NULL DEFAULT 0,
    tools_called JSONB DEFAULT '[]'::jsonb,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for usage and cost queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_org_created 
    ON public.ai_usage_analytics (organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_user 
    ON public.ai_usage_analytics (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_agent 
    ON public.ai_usage_analytics (agent_id, created_at);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ai_agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- 4. RLS SECURITY POLICIES (FAIL-CLOSED: NO ORG CONTEXT = NO ACCESS)
-- Enforce tenant isolation via app.current_organization_id (never fallback to static defaults)

CREATE POLICY "Tenant AI agent memories access policy"
    ON public.ai_agent_memories FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant AI usage analytics select policy"
    ON public.ai_usage_analytics FOR SELECT
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);

CREATE POLICY "Tenant AI usage analytics insert policy"
    ON public.ai_usage_analytics FOR INSERT
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);
