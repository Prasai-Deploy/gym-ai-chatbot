-- ==========================================
-- SPRINT 4E: PROGRESS ANALYTICS MIGRATION
-- ==========================================

-- 1. PROGRESS STATISTICS (1:1 with users)
CREATE TABLE public.progress_statistics (
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
CREATE TYPE snapshot_type AS ENUM ('daily', 'weekly', 'monthly');

CREATE TABLE public.progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type snapshot_type NOT NULL,
    snapshot_date DATE NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, type, snapshot_date)
);

-- 3. ACHIEVEMENTS (System Reference Data)
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g. 'CENTURY_CLUB'
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. USER ACHIEVEMENTS
CREATE TABLE public.user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- 5. MILESTONES (Append-Only Log for PRs, etc.)
CREATE TABLE public.user_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g. 'NEW_PR', 'STREAK_365'
    description TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
CREATE TRIGGER update_progress_stats_modtime BEFORE UPDATE ON public.progress_statistics FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.progress_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

-- Read Access: Members can read their own stats
CREATE POLICY "Members Read Own Stats" ON public.progress_statistics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members Read Own Snapshots" ON public.progress_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public Read Achievements" ON public.achievements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Members Read Own Unlocked Achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members Read Own Milestones" ON public.user_milestones FOR SELECT USING (auth.uid() = user_id);

-- Write Access is restricted (handled by Supabase Service Role Key via backend event subscribers).
