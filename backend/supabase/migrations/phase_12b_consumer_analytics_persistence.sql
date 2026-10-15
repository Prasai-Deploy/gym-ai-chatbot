-- ====================================================================
-- STRIVA V2 - Phase 12B: Consumer AI Usage Analytics Persistence
--
-- Target Database: Supabase project ymrblyiwohvxptiqjfsi (Staging Baseline: 27 migrations)
-- Advisory Lock Key: 746291048201582
--
-- Approved Scope:
-- 1. Schema Alteration: public.ai_usage_analytics
--    - Allow organization_id to be NULL for direct consumer AI usage events.
--    - Preserve FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
--      for all non-NULL organization events (PostgreSQL enforces FK only when column is not null).
--    - Preserve user_id NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE for all records.
-- 2. Performance Index:
--    - Add partial index idx_ai_usage_analytics_consumer_user for fast consumer queries
--      where organization_id IS NULL.
-- 3. Row Level Security (RLS) Enhancement:
--    - Add "Users view own consumer AI usage analytics" FOR SELECT (auth.uid() = user_id AND organization_id IS NULL).
--    - Add "Users insert own consumer AI usage analytics" FOR INSERT (auth.uid() = user_id AND organization_id IS NULL).
--    - Preserve existing "Tenant AI usage analytics select policy" and "Tenant AI usage analytics insert policy"
--      for organization members.
--
-- Explicit Constraints:
-- - Zero hardcoded tenant IDs or default organization fallbacks.
-- - No modification to previous Phase 11 or Phase 12A migration files.
-- - Transaction-safe and idempotent.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Alter Column Nullability
-- --------------------------------------------------------------------
ALTER TABLE public.ai_usage_analytics
    ALTER COLUMN organization_id DROP NOT NULL;

COMMENT ON COLUMN public.ai_usage_analytics.organization_id IS
'Organization UUID for B2B usage attribution; NULL for individual direct consumer usage.';

-- --------------------------------------------------------------------
-- 2. Consumer Performance Index
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_consumer_user
    ON public.ai_usage_analytics (user_id, created_at)
    WHERE organization_id IS NULL;

-- --------------------------------------------------------------------
-- 3. Row Level Security Policies for Consumer Records
-- --------------------------------------------------------------------
DO $$
BEGIN
    -- Policy: Authenticated users can view their own consumer usage records
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ai_usage_analytics'
          AND policyname = 'Users view own consumer AI usage analytics'
    ) THEN
        CREATE POLICY "Users view own consumer AI usage analytics"
            ON public.ai_usage_analytics FOR SELECT
            USING (
                auth.uid() = user_id
                AND organization_id IS NULL
            );
    END IF;

    -- Policy: Authenticated users can insert their own consumer usage records
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ai_usage_analytics'
          AND policyname = 'Users insert own consumer AI usage analytics'
    ) THEN
        CREATE POLICY "Users insert own consumer AI usage analytics"
            ON public.ai_usage_analytics FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
                AND organization_id IS NULL
            );
    END IF;
END;
$$;
