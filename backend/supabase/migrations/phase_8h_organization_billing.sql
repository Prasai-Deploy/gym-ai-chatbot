-- ====================================================================
-- STRIVA V2 - Phase 8H: Organization Billing & Financial Operations Migration
-- Introduces canonical B2B organization billing entities:
-- 1. organization_billing_accounts
-- 2. organization_subscription_plans
-- 3. organization_subscriptions
-- 4. organization_invoices
-- 5. organization_payment_events
-- Enforces integer paise arithmetic, strict foreign keys, idempotency constraints,
-- and PostgreSQL Row Level Security (RLS) policies.
-- ====================================================================

-- 1. ORGANIZATION BILLING ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.organization_billing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    billing_name VARCHAR(255),
    billing_email VARCHAR(255),
    tax_id VARCHAR(50), -- e.g. GSTIN, null if unconfigured
    billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'pending_setup', -- pending_setup, active, delinquent
    tax_status VARCHAR(50) NOT NULL DEFAULT 'unconfigured', -- unconfigured, verified, exempt
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_billing_accounts_org UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_billing_accounts_org ON public.organization_billing_accounts(organization_id);

-- 2. ORGANIZATION SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.organization_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. gym_starter, gym_growth, gym_enterprise
    name VARCHAR(255) NOT NULL,
    description TEXT,
    interval VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    amount_paise INT DEFAULT NULL, -- Minor currency unit (paise). NULL or 0 if unconfigured
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_configured BOOLEAN NOT NULL DEFAULT false, -- Must be explicitly approved and configured
    is_active BOOLEAN NOT NULL DEFAULT false,
    max_locations INT NOT NULL DEFAULT 1,
    max_staff INT NOT NULL DEFAULT 5,
    max_members INT NOT NULL DEFAULT 200,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    razorpay_plan_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_sub_plans_code ON public.organization_subscription_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_org_sub_plans_active ON public.organization_subscription_plans(is_active);

-- 3. ORGANIZATION SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.organization_subscription_plans(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'none',
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    amount_paise INT NOT NULL DEFAULT 0,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    razorpay_customer_id VARCHAR(255),
    razorpay_subscription_id VARCHAR(255) UNIQUE,
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_subscriptions_org UNIQUE (organization_id),
    CONSTRAINT chk_org_sub_status CHECK (status IN ('none', 'pending_checkout', 'active', 'past_due', 'grace_period', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_org_subs_org ON public.organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subs_status ON public.organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subs_razorpay_sub_id ON public.organization_subscriptions(razorpay_subscription_id);

-- 4. ORGANIZATION INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.organization_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount_paise INT NOT NULL DEFAULT 0,
    subtotal_paise INT NOT NULL DEFAULT 0,
    discount_paise INT NOT NULL DEFAULT 0,
    tax_paise INT NOT NULL DEFAULT 0,
    tax_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid', -- paid, unpaid, void, failed
    type VARCHAR(50) NOT NULL DEFAULT 'receipt', -- receipt, tax_invoice
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    razorpay_payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    razorpay_invoice_id VARCHAR(255),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_org_invoice_status CHECK (status IN ('unpaid', 'paid', 'void', 'failed')),
    CONSTRAINT chk_org_invoice_type CHECK (type IN ('receipt', 'tax_invoice'))
);

CREATE INDEX IF NOT EXISTS idx_org_invoices_org ON public.organization_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invoices_status ON public.organization_invoices(status);
CREATE INDEX IF NOT EXISTS idx_org_invoices_number ON public.organization_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_org_invoices_issued ON public.organization_invoices(issued_at);

-- 5. ORGANIZATION PAYMENT EVENTS TABLE (Idempotency Store)
CREATE TABLE IF NOT EXISTS public.organization_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, ignored, failed
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_org_payment_event_status CHECK (status IN ('pending', 'processed', 'ignored', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_org_pay_events_event_id ON public.organization_payment_events(event_id);
CREATE INDEX IF NOT EXISTS idx_org_pay_events_org ON public.organization_payment_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_pay_events_status ON public.organization_payment_events(status);

-- 6. CANONICAL SEED DATA (Unconfigured B2B Plans - Awaiting Approval)
-- Prices are deliberately unconfigured (amount_paise = NULL, is_configured = false)
-- Fails closed if checkout is attempted without explicit owner approval.
INSERT INTO public.organization_subscription_plans (
    plan_code,
    name,
    description,
    interval,
    amount_paise,
    currency,
    is_configured,
    is_active,
    max_locations,
    max_staff,
    max_members,
    features,
    razorpay_plan_id
) VALUES 
(
    'gym_starter',
    'STRIVA Gym Starter OS',
    'Essential Gym Management OS for single-facility gyms. Up to 1 facility, 5 staff seats, 200 members.',
    'monthly',
    NULL,
    'INR',
    false,
    false,
    1,
    5,
    200,
    '{"locations": 1, "staff_seats": 5, "members": 200, "qr_attendance": true, "ai_coach": false, "custom_branding": false}'::jsonb,
    NULL
),
(
    'gym_growth',
    'STRIVA Gym Growth OS',
    'Advanced Gym Management OS for multi-facility operations. Up to 3 facilities, 15 staff seats, 600 members.',
    'monthly',
    NULL,
    'INR',
    false,
    false,
    3,
    15,
    600,
    '{"locations": 3, "staff_seats": 15, "members": 600, "qr_attendance": true, "ai_coach": true, "custom_branding": true}'::jsonb,
    NULL
),
(
    'gym_enterprise',
    'STRIVA Gym Enterprise OS',
    'Full enterprise suite with unlimited facilities, custom staff rosters, and dedicated TRINETRA coaching models.',
    'monthly',
    NULL,
    'INR',
    false,
    false,
    10,
    50,
    2000,
    '{"locations": 10, "staff_seats": 50, "members": 2000, "qr_attendance": true, "ai_coach": true, "custom_branding": true, "priority_support": true}'::jsonb,
    NULL
)
ON CONFLICT (plan_code) DO NOTHING;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organization_billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_payment_events ENABLE ROW LEVEL SECURITY;

-- 8. CANONICAL FAIL-CLOSED RLS POLICIES

-- Organization Billing Accounts: Owner and Super Admin read only
CREATE POLICY "Owners view organization billing account" ON public.organization_billing_accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_billing_accounts.organization_id AND o.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_billing_accounts.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Platform Super Admin')
        )
    );

-- Organization Subscription Plans: All authenticated members can view plans
CREATE POLICY "Authenticated users view subscription plans" ON public.organization_subscription_plans
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Organization Subscriptions: Owner and Super Admin read only
CREATE POLICY "Owners view organization subscription" ON public.organization_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_subscriptions.organization_id AND o.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_subscriptions.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Platform Super Admin')
        )
    );

-- Organization Invoices: Owner, Manager, Super Admin read only
CREATE POLICY "Owners and managers view organization invoices" ON public.organization_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = organization_invoices.organization_id AND o.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_invoices.organization_id
              AND om.user_id = auth.uid()
              AND om.role IN ('Organization Owner', 'Gym Manager', 'Platform Super Admin')
        )
    );

-- Organization Payment Events: Platform Super Admin read only (auditable event ledger)
CREATE POLICY "Super admins view organization payment events" ON public.organization_payment_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid() AND om.role = 'Platform Super Admin'
        )
    );
