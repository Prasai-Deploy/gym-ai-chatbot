-- ==========================================
-- PHASE 4D: PROGRESS ANALYTICS MIGRATION
-- ==========================================

-- 1. PROGRESS STATISTICS (1:1 with users)
CREATE TABLE IF NOT EXISTS public.progress_statistics (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_count INT DEFAULT 0,
    lifetime_volume_kg NUMERIC(12,2) DEFAULT 0,
    total_training_time_seconds INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_workout_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. PROGRESS SNAPSHOTS (Append-Only Time Series)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'snapshot_type') THEN
        CREATE TYPE snapshot_type AS ENUM ('daily', 'weekly', 'monthly');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type snapshot_type NOT NULL,
    snapshot_date DATE NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, type, snapshot_date)
);

-- 3. ACHIEVEMENTS (System Reference Data)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g. 'CENTURY_CLUB'
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- 5. MILESTONES (Append-Only Log for PRs, etc.)
CREATE TABLE IF NOT EXISTS public.user_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g. 'NEW_PR', 'STREAK_365'
    description TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_progress_stats_modtime') THEN
        CREATE TRIGGER update_progress_stats_modtime BEFORE UPDATE ON public.progress_statistics FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END$$;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.progress_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

-- Read Access: Members can read their own stats
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members Read Own Stats' AND tablename = 'progress_statistics') THEN
        CREATE POLICY "Members Read Own Stats" ON public.progress_statistics FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members Read Own Snapshots' AND tablename = 'progress_snapshots') THEN
        CREATE POLICY "Members Read Own Snapshots" ON public.progress_snapshots FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Public Read Achievements" ON public.achievements FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members Read Own Unlocked Achievements' AND tablename = 'user_achievements') THEN
        CREATE POLICY "Members Read Own Unlocked Achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members Read Own Milestones' AND tablename = 'user_milestones') THEN
        CREATE POLICY "Members Read Own Milestones" ON public.user_milestones FOR SELECT USING (auth.uid() = user_id);
    END IF;
END$$;

-- Write Access is restricted (handled by Supabase Service Role Key via backend event subscribers).
