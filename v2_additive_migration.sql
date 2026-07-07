-- ==========================================
-- SPRINT 4C: IDENTITY DOMAIN MIGRATION
-- ==========================================

-- ENUMS
CREATE TYPE fitness_level AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');
CREATE TYPE preferred_unit AS ENUM ('metric', 'imperial');

-- 1. PROFILES (Source of truth for identity, 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. FITNESS PROFILES
CREATE TABLE IF NOT EXISTS public.v2_fitness_profiles (
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
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_system preferred_unit DEFAULT 'metric',
    push_notifications_enabled BOOLEAN DEFAULT true,
    email_notifications_enabled BOOLEAN DEFAULT true,
    weekly_reports_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. MEMBER SETTINGS (App specific settings)
CREATE TABLE IF NOT EXISTS public.member_settings (
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
    INSERT INTO public.v2_fitness_profiles (id) VALUES (NEW.id);
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
CREATE TRIGGER update_fitness_profiles_modtime BEFORE UPDATE ON public.v2_fitness_profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_user_preferences_modtime BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_member_settings_modtime BEFORE UPDATE ON public.member_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own fitness profile" ON public.v2_fitness_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own fitness profile" ON public.v2_fitness_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own settings" ON public.member_settings FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own settings" ON public.member_settings FOR UPDATE USING (auth.uid() = id);


-- ==========================================
-- SPRINT 4D1: EXERCISE LIBRARY MIGRATION
-- ==========================================

-- ENUMS
CREATE TYPE exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

-- 1. LOOKUP TABLES
CREATE TABLE IF NOT EXISTS public.exercise_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.muscle_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.movement_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g. Push, Pull, Hinge
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g. Strength, Cardio, Mobility
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. CORE EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    instructions TEXT[],
    difficulty exercise_difficulty DEFAULT 'beginner',
    category_id UUID REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
    movement_pattern_id UUID REFERENCES public.movement_patterns(id) ON DELETE SET NULL,
    exercise_type_id UUID REFERENCES public.exercise_types(id) ON DELETE SET NULL,
    estimated_calories NUMERIC(5,2),
    estimated_met NUMERIC(5,2),
    image_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. RELATIONAL MAPPINGS (Many-To-Many)
CREATE TABLE IF NOT EXISTS public.exercise_muscles (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    muscle_group_id UUID REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_equipment (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, equipment_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_tags_map (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.exercise_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_variations (
    base_exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    variation_exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (base_exercise_id, variation_exercise_id),
    CHECK (base_exercise_id != variation_exercise_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_alternatives (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    alternative_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, alternative_id),
    CHECK (exercise_id != alternative_id)
);

-- TRIGGERS for updated_at
CREATE TRIGGER update_exercises_modtime BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- Read Access: Authenticated users can read reference data
CREATE POLICY "Public Read Access" ON public.exercise_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.muscle_groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.equipment FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.movement_patterns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercises FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_muscles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_equipment FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_tags_map FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_variations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read Access" ON public.exercise_alternatives FOR SELECT USING (auth.role() = 'authenticated');

-- Write Access is restricted (implicitly handled by Supabase Service Role Key for backend administration).


-- ==========================================
-- SPRINT 4D2: WORKOUT ENGINE MIGRATION
-- ==========================================

-- ENUMS
CREATE TYPE workout_state AS ENUM ('planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled');
CREATE TYPE set_status AS ENUM ('planned', 'completed', 'skipped');

-- ==========================================
-- 1. PLANNING TABLES (Immutable after publish)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.program_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (program_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.workout_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES public.program_versions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workout_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workout_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID REFERENCES public.workout_weeks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workout_day_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID REFERENCES public.workout_days(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE RESTRICT,
    order_index INT NOT NULL,
    target_sets INT NOT NULL DEFAULT 3,
    target_reps TEXT, -- Can be "10", "8-12", "To Failure"
    target_weight TEXT, -- Can be "20kg", "RPE 8"
    target_rest_seconds INT,
    target_tempo TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- 2. EXECUTION TABLES (Historical / State-Driven)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.v2_workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID REFERENCES public.workout_days(id) ON DELETE SET NULL, -- Null if ad-hoc workout
    state workout_state DEFAULT 'planned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID REFERENCES public.v2_workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE RESTRICT,
    order_index INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_session_id UUID REFERENCES public.exercise_sessions(id) ON DELETE CASCADE,
    set_number INT NOT NULL,
    weight_kg NUMERIC(6,2),
    reps INT,
    rpe NUMERIC(3,1),
    tempo TEXT,
    rest_time_seconds INT,
    status set_status DEFAULT 'planned',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- 3. EVENT SOURCING (Append-Only)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.workout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID REFERENCES public.v2_workout_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
CREATE TRIGGER update_programs_modtime BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_workout_sessions_modtime BEFORE UPDATE ON public.v2_workout_sessions FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_events ENABLE ROW LEVEL SECURITY;

-- Planning access: Public can read published versions
CREATE POLICY "Public Read Published Versions" ON public.program_versions FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Public Read Blocks" ON public.workout_blocks FOR SELECT USING (true);
CREATE POLICY "Public Read Weeks" ON public.workout_weeks FOR SELECT USING (true);
CREATE POLICY "Public Read Days" ON public.workout_days FOR SELECT USING (true);
CREATE POLICY "Public Read Day Exercises" ON public.workout_day_exercises FOR SELECT USING (true);

-- Execution access: Members can ONLY read and write their OWN sessions
CREATE POLICY "Members Manage Own Sessions" ON public.v2_workout_sessions FOR ALL USING (auth.uid() = user_id);

-- Exercise sessions implicitly owned by workout_session
CREATE POLICY "Members Manage Own Exercise Sessions" ON public.exercise_sessions FOR ALL USING (
    workout_session_id IN (SELECT id FROM public.v2_workout_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Members Manage Own Sets" ON public.exercise_sets FOR ALL USING (
    exercise_session_id IN (
        SELECT es.id FROM public.exercise_sessions es 
        JOIN public.v2_workout_sessions ws ON es.workout_session_id = ws.id 
        WHERE ws.user_id = auth.uid()
    )
);

CREATE POLICY "Members Manage Own Events" ON public.workout_events FOR ALL USING (
    workout_session_id IN (SELECT id FROM public.v2_workout_sessions WHERE user_id = auth.uid())
);


-- ==========================================
-- SPRINT 4E: PROGRESS ANALYTICS MIGRATION
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
CREATE TYPE snapshot_type AS ENUM ('daily', 'weekly', 'monthly');

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


-- ==========================================
-- SPRINT 4F: INTELLIGENCE & CONTEXT MIGRATION
-- ==========================================

-- 1. AI MEMORY
-- Stores structured long-term memory for the AI.
CREATE TABLE IF NOT EXISTS public.ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g. 'INJURY', 'PREFERENCE', 'GOAL'
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, category, key)
);

-- 2. RECOVERY LOGS
-- Stores daily recovery metrics (sleep, stress, readiness)
CREATE TABLE IF NOT EXISTS public.recovery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sleep_hours NUMERIC(4,2),
    stress_level INT CHECK (stress_level >= 1 AND stress_level <= 10),
    soreness_level INT CHECK (soreness_level >= 1 AND soreness_level <= 10),
    energy_level INT CHECK (energy_level >= 1 AND energy_level <= 10),
    readiness_score INT CHECK (readiness_score >= 0 AND readiness_score <= 100),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, date)
);

-- 3. NUTRITION LOGS
-- Stores daily nutrition tracking and macros
CREATE TABLE IF NOT EXISTS public.v2_nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    calories_consumed INT DEFAULT 0,
    protein_g INT DEFAULT 0,
    carbs_g INT DEFAULT 0,
    fats_g INT DEFAULT 0,
    hydration_ml INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, date)
);

-- 4. USER GOALS
-- Tracks explicit user goals to pass into the AI context
CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL, -- e.g. 'WEIGHT_LOSS', 'STRENGTH'
    target_value NUMERIC(10,2),
    current_value NUMERIC(10,2),
    target_date DATE,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ACHIEVED, ABANDONED
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. RECOMMENDATIONS
-- Rule-based recommendations generated by the backend
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g. 'WORKOUT', 'RECOVERY', 'NUTRITION'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
CREATE TRIGGER update_ai_memory_modtime BEFORE UPDATE ON public.ai_memory FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_recovery_logs_modtime BEFORE UPDATE ON public.recovery_logs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_nutrition_logs_modtime BEFORE UPDATE ON public.v2_nutrition_logs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_user_goals_modtime BEFORE UPDATE ON public.user_goals FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Security Policies (Members manage their own data)
CREATE POLICY "Members manage own memory" ON public.ai_memory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members manage own recovery" ON public.recovery_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members manage own nutrition" ON public.v2_nutrition_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members manage own goals" ON public.user_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members read own recommendations" ON public.recommendations FOR SELECT USING (auth.uid() = user_id);


-- ==========================================
-- SPRINT 4G: AI RUNTIME & ORCHESTRATION MIGRATION
-- ==========================================

-- 1. AI CONVERSATIONS
-- Tracks a continuous dialogue session with the AI.
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, ARCHIVED
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. AI MESSAGES
-- Appends history of chat (User, Assistant, Tool payloads)
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT,
    tool_calls JSONB, -- Array of tools the assistant wants to call
    tool_call_id TEXT, -- ID if this is a tool response
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. AI TOOL EXECUTIONS
-- Audit log for tracking every tool invoked by the LLM
CREATE TABLE IF NOT EXISTS public.ai_tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input_payload JSONB,
    output_payload JSONB,
    status TEXT NOT NULL, -- 'SUCCESS', 'ERROR'
    error_message TEXT,
    latency_ms INT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
CREATE TRIGGER update_ai_conversations_modtime BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_executions ENABLE ROW LEVEL SECURITY;

-- Security Policies (Members manage their own data)
CREATE POLICY "Members manage own conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members manage own messages" ON public.ai_messages FOR ALL USING (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
);
CREATE POLICY "Members read own tool executions" ON public.ai_tool_executions FOR SELECT USING (auth.uid() = user_id);
-- Writing tool executions happens via Service Role in backend


