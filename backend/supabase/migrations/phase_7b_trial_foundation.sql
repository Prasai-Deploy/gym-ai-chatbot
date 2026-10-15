-- ====================================================================
-- STRIVA V2 — PHASE 7.5B: 14-DAY TRIAL FOUNDATION & SUBSCRIPTION SCHEMA
-- Canonical additive migration for server-authoritative 14-day trials,
-- Razorpay identity fields, trial constraints, indexes, and safe
-- user auto-provisioning.
-- ====================================================================

-- 1. ADDITIVE TRIAL & RAZORPAY PROVIDER COLUMNS ON public.subscriptions
-- Strictly additive: preserves legacy stripe_* columns to ensure zero regressions in existing code.
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'razorpay' NOT NULL,
    ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- 2. UNIQUE CONSTRAINTS ON RAZORPAY IDENTIFIERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_razorpay_customer_id_key') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_razorpay_customer_id_key UNIQUE (razorpay_customer_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_razorpay_subscription_id_key') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_razorpay_subscription_id_key UNIQUE (razorpay_subscription_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. LOGICAL INTEGRITY CONSTRAINT ON TRIAL DURATION
-- Safe for nullable legacy records: passes if either field is NULL.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_trial_dates') THEN
        ALTER TABLE public.subscriptions ADD CONSTRAINT chk_subscriptions_trial_dates
            CHECK (trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at >= trial_started_at);
    END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. PERFORMANCE & ENTITLEMENT INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at ON public.subscriptions(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub_id ON public.subscriptions(razorpay_subscription_id);

-- 5. SERVER-SIDE 14-DAY TRIAL PROVISIONING IN public.handle_new_user()
-- Trigger executes AFTER INSERT ON auth.users with SECURITY DEFINER and fixed search_path = public.
-- Idempotent: ON CONFLICT (user_id) DO NOTHING ensures trials can NEVER be reset or restarted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Identity, fitness profile, preferences, and settings provisioning
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.v2_fitness_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_preferences (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.member_settings (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;

    -- 2. Subscription & Trial Provisioning
    -- Sandbox Isolation: Demo user (demo@sweatfix.com) receives permanent sandbox access without a commercial trial
    IF NEW.email = 'demo@sweatfix.com' THEN
        INSERT INTO public.subscriptions (
            user_id,
            tier,
            interval,
            status,
            provider,
            trial_started_at,
            trial_ends_at,
            current_period_start,
            current_period_end,
            cancel_at_period_end
        ) VALUES (
            NEW.id,
            'free',
            'monthly',
            'active',
            'razorpay',
            NULL,
            NULL,
            NOW(),
            NOW() + INTERVAL '100 years',
            FALSE
        ) ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- Real New User: Exactly one 14-day free trial in 'trialing' state
        -- ON CONFLICT (user_id) DO NOTHING guarantees that re-logins or trigger re-runs NEVER reset the trial
        INSERT INTO public.subscriptions (
            user_id,
            tier,
            interval,
            status,
            provider,
            trial_started_at,
            trial_ends_at,
            current_period_start,
            current_period_end,
            cancel_at_period_end
        ) VALUES (
            NEW.id,
            'pro',
            'monthly',
            'trialing',
            'razorpay',
            NOW(),
            NOW() + INTERVAL '14 days',
            NOW(),
            NOW() + INTERVAL '14 days',
            FALSE
        ) ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. EXISTING USER PROVIDER DEFAULT ALIGNMENT
-- Ensure all existing subscription records have provider set to 'razorpay' where NULL.
-- Does NOT touch status, tier, or dates of existing records.
UPDATE public.subscriptions
SET provider = 'razorpay'
WHERE provider IS NULL;
