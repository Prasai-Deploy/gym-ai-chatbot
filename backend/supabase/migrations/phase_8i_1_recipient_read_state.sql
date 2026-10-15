-- ====================================================================
-- STRIVA V2 - Phase 8I.1: Recipient-Specific Notification Reads Migration
-- Normalizes notification read states per recipient user,
-- preventing shared role notifications from being prematurely marked read for other users.
-- ====================================================================

-- 1. RECIPIENT NOTIFICATION READS TABLE
CREATE TABLE IF NOT EXISTS public.organization_notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.organization_notifications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_user_read UNIQUE (notification_id, user_id)
);

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_org_notif_reads_user ON public.organization_notification_reads(user_id, notification_id);
CREATE INDEX IF NOT EXISTS idx_org_notif_reads_org ON public.organization_notification_reads(organization_id, user_id);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organization_notification_reads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Select Policy: Users can view their own read records within their tenant
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_notification_reads' 
          AND policyname = 'Users view own notification read state'
    ) THEN
        CREATE POLICY "Users view own notification read state" 
        ON public.organization_notification_reads
        FOR SELECT USING (
            auth.uid() = user_id
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = organization_notification_reads.organization_id
                  AND om.user_id = auth.uid()
            )
        );
    END IF;

    -- Insert/Update Policy: Users can only mark notifications as read for themselves
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_notification_reads' 
          AND policyname = 'Users mark notifications read for themselves'
    ) THEN
        CREATE POLICY "Users mark notifications read for themselves" 
        ON public.organization_notification_reads
        FOR INSERT WITH CHECK (
            auth.uid() = user_id
            AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = organization_notification_reads.organization_id
                  AND om.user_id = auth.uid()
            )
        );
    END IF;
END $$;
