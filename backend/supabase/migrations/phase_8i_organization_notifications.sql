-- ====================================================================
-- STRIVA V2 - Phase 8I: Organization Notifications & Attention System Migration
-- Introduces canonical organization-scoped notifications table,
-- deterministic deduplication, read tracking, and PostgreSQL Row Level Security (RLS).
-- ====================================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organization_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50) DEFAULT 'Organization Owner',
    type VARCHAR(100) NOT NULL, -- e.g. billing_past_due, trainer_unassigned, attendance_unclosed, staff_invitation_pending, system_notice
    severity VARCHAR(20) NOT NULL DEFAULT 'info', -- info, warning, critical
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_type VARCHAR(100), -- subscription, trainer, attendance, member, invoice
    resource_id VARCHAR(255),
    action_path VARCHAR(255), -- /owner/billing, /owner/trainers, /owner/attendance, /owner/members
    action_label VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    deduplication_key VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_org_notification_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_org_notifications_org ON public.organization_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_notifications_recipient ON public.organization_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_org_notifications_role ON public.organization_notifications(organization_id, recipient_role);
CREATE INDEX IF NOT EXISTS idx_org_notifications_read ON public.organization_notifications(organization_id, is_read);
CREATE INDEX IF NOT EXISTS idx_org_notifications_created ON public.organization_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_notifications_dedup ON public.organization_notifications(organization_id, deduplication_key);

-- 3. UNIQUE PARTIAL INDEX FOR ACTIVE DEDUPLICATION
-- Prevents repeated evaluation from creating duplicate unread notifications for the same active condition
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_notifications_active_dedup 
ON public.organization_notifications(organization_id, deduplication_key) 
WHERE is_read = false AND deduplication_key IS NOT NULL;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organization_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Select Policy: User can read notifications for their tenant if authorized
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_notifications' 
          AND policyname = 'Authorized tenant members read organization notifications'
    ) THEN
        CREATE POLICY "Authorized tenant members read organization notifications" 
        ON public.organization_notifications
        FOR SELECT USING (
            (
                -- User is owner of the organization
                EXISTS (
                    SELECT 1 FROM public.organizations o
                    WHERE o.id = organization_notifications.organization_id AND o.owner_id = auth.uid()
                )
                OR
                -- User is direct recipient
                (organization_notifications.recipient_user_id = auth.uid())
                OR
                -- User has authorized role in organization_members
                EXISTS (
                    SELECT 1 FROM public.organization_members om
                    WHERE om.organization_id = organization_notifications.organization_id
                      AND om.user_id = auth.uid()
                      AND (
                          om.role = 'Platform Super Admin'
                          OR om.role = 'Organization Owner'
                          OR (
                              om.role = 'Gym Manager' 
                              AND organization_notifications.type NOT LIKE 'billing_%'
                          )
                          OR (
                              om.role = organization_notifications.recipient_role
                              AND organization_notifications.type NOT LIKE 'billing_%'
                          )
                      )
                )
            )
        );
    END IF;

    -- Update Policy: Recipients can mark their own notifications as read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_notifications' 
          AND policyname = 'Recipients update read state of organization notifications'
    ) THEN
        CREATE POLICY "Recipients update read state of organization notifications" 
        ON public.organization_notifications
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.organizations o
                WHERE o.id = organization_notifications.organization_id AND o.owner_id = auth.uid()
            )
            OR
            (organization_notifications.recipient_user_id = auth.uid())
            OR
            EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = organization_notifications.organization_id
                  AND om.user_id = auth.uid()
                  AND om.role IN ('Platform Super Admin', 'Organization Owner', 'Gym Manager')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.organizations o
                WHERE o.id = organization_notifications.organization_id AND o.owner_id = auth.uid()
            )
            OR
            (organization_notifications.recipient_user_id = auth.uid())
            OR
            EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = organization_notifications.organization_id
                  AND om.user_id = auth.uid()
                  AND om.role IN ('Platform Super Admin', 'Organization Owner', 'Gym Manager')
            )
        );
    END IF;
END $$;
