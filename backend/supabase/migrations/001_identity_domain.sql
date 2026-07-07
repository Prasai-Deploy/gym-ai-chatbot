-- ==========================================
-- SPRINT 4C: IDENTITY DOMAIN MIGRATION
-- ==========================================

-- ENUMS
CREATE TYPE fitness_level AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');
CREATE TYPE preferred_unit AS ENUM ('metric', 'imperial');

-- 1. PROFILES (Source of truth for identity, 1:1 with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. FITNESS PROFILES
CREATE TABLE public.fitness_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    level fitness_level DEFAULT 'beginner',
    height_cm NUMERIC(5,2),
    target_weight_kg NUMERIC(5,2),
    primary_goal TEXT,
    medical_conditions TEXT[],
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. USER PREFERENCES
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_system preferred_unit DEFAULT 'metric',
    push_notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    weekly_reports_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. MEMBER SETTINGS (App specific settings)
CREATE TABLE public.member_settings (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',
    start_of_week INT DEFAULT 1, -- 1=Monday
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS & FUNCTIONS
-- Sync auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Auto-create relational profiles
    INSERT INTO public.fitness_profiles (id) VALUES (NEW.id);
    INSERT INTO public.user_preferences (id) VALUES (NEW.id);
    INSERT INTO public.member_settings (id) VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_fitness_profiles_modtime BEFORE UPDATE ON public.fitness_profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_user_preferences_modtime BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_member_settings_modtime BEFORE UPDATE ON public.member_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own fitness profile" ON public.fitness_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own fitness profile" ON public.fitness_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own settings" ON public.member_settings FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own settings" ON public.member_settings FOR UPDATE USING (auth.uid() = id);
