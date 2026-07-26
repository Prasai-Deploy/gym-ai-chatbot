-- ==========================================
-- SPRINT 4D2: WORKOUT ENGINE MIGRATION
-- ==========================================

-- ENUMS
CREATE TYPE workout_state AS ENUM ('planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled');
CREATE TYPE set_status AS ENUM ('planned', 'completed', 'skipped');

-- ==========================================
-- 1. PLANNING TABLES (Immutable after publish)
-- ==========================================

CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.program_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (program_id, version_number)
);

CREATE TABLE public.workout_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES public.program_versions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.workout_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.workout_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID REFERENCES public.workout_weeks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.workout_day_exercises (
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

CREATE TABLE public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_id UUID REFERENCES public.workout_days(id) ON DELETE SET NULL, -- Null if ad-hoc workout
    state workout_state DEFAULT 'planned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE RESTRICT,
    order_index INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.exercise_sets (
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

CREATE TABLE public.workout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TRIGGERS
CREATE TRIGGER update_programs_modtime BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_workout_sessions_modtime BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Members Manage Own Sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);

-- Exercise sessions implicitly owned by workout_session
CREATE POLICY "Members Manage Own Exercise Sessions" ON public.exercise_sessions FOR ALL USING (
    workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Members Manage Own Sets" ON public.exercise_sets FOR ALL USING (
    exercise_session_id IN (
        SELECT es.id FROM public.exercise_sessions es 
        JOIN public.workout_sessions ws ON es.workout_session_id = ws.id 
        WHERE ws.user_id = auth.uid()
    )
);

CREATE POLICY "Members Manage Own Events" ON public.workout_events FOR ALL USING (
    workout_session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
);
