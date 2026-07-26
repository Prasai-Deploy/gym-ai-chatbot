-- ==========================================
-- PHASE 7A: SAAS SUBSCRIPTION & BILLING MIGRATION
-- ==========================================

-- ENUMS
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('paid', 'open', 'void', 'uncollectible');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier subscription_tier DEFAULT 'free' NOT NULL,
    interval billing_interval DEFAULT 'monthly' NOT NULL,
    status subscription_status DEFAULT 'active' NOT NULL,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    current_period_start TIMESTAMPTZ DEFAULT now() NOT NULL,
    current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 month') NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id TEXT UNIQUE,
    amount_paid NUMERIC(10,2) DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'usd' NOT NULL,
    status invoice_status DEFAULT 'paid' NOT NULL,
    invoice_pdf TEXT,
    paid_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. PAYMENT EVENTS AUDIT TABLE (Idempotency Store)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, PROCESSED, FAILED
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. FEATURE USAGE TRACKER
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL, -- e.g. 'ai_queries', 'ai_workout_plans', 'ai_diet_plans'
    usage_count INT DEFAULT 0 NOT NULL,
    reset_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 day') NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, feature_key)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON public.payment_events(event_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature ON public.feature_usage(user_id, feature_key);

-- TRIGGERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_modtime') THEN
        CREATE TRIGGER update_subscriptions_modtime BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_feature_usage_modtime') THEN
        CREATE TRIGGER update_feature_usage_modtime BEFORE UPDATE ON public.feature_usage FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own subscription' AND tablename = 'subscriptions') THEN
        CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own invoices' AND tablename = 'invoices') THEN
        CREATE POLICY "Users read own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own feature usage' AND tablename = 'feature_usage') THEN
        CREATE POLICY "Users read own feature usage" ON public.feature_usage FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- BACKFILL DEFAULT FREE SUBSCRIPTIONS FOR ALL PROFILES
INSERT INTO public.subscriptions (user_id, tier, interval, status)
SELECT id, 'free', 'monthly', 'active' FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;
