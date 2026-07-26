-- ==========================================
-- PHASE 4B: EXERCISE DOMAIN MIGRATION
-- ==========================================

DO $$ BEGIN
    CREATE TYPE exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.exercise_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
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
    video_url TEXT,
    thumbnail_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. MAPPING TABLES (Many-to-Many)
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
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    variation_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, variation_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_alternatives (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    alternative_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, alternative_id)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON public.exercises(movement_pattern_id);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON public.exercises(exercise_type_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_primary ON public.exercise_muscles(muscle_group_id) WHERE is_primary = true;

-- 5. RLS POLICIES
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

-- Allow public read access to all exercise reference data
DO $$ BEGIN
    CREATE POLICY "Public read access to exercise categories" ON public.exercise_categories FOR SELECT USING (true);
    CREATE POLICY "Public read access to muscle groups" ON public.muscle_groups FOR SELECT USING (true);
    CREATE POLICY "Public read access to equipment" ON public.equipment FOR SELECT USING (true);
    CREATE POLICY "Public read access to movement patterns" ON public.movement_patterns FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise types" ON public.exercise_types FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise tags" ON public.exercise_tags FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercises" ON public.exercises FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise_muscles" ON public.exercise_muscles FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise_equipment" ON public.exercise_equipment FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise_tags_map" ON public.exercise_tags_map FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise_variations" ON public.exercise_variations FOR SELECT USING (true);
    CREATE POLICY "Public read access to exercise_alternatives" ON public.exercise_alternatives FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. SEEDING STRATEGY
INSERT INTO public.exercise_categories (name, description) VALUES
    ('Strength', 'Resistance training for muscle mass and strength'),
    ('Cardio', 'Cardiovascular endurance training'),
    ('Flexibility', 'Stretching and mobility exercises'),
    ('Plyometrics', 'Explosive power training')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.muscle_groups (name, description) VALUES
    ('Chest', 'Pectoralis major and minor'),
    ('Back', 'Latissimus dorsi, rhomboids, trapezius'),
    ('Legs', 'Quadriceps, hamstrings, calves, glutes'),
    ('Arms', 'Biceps, triceps, forearms'),
    ('Shoulders', 'Deltoids'),
    ('Core', 'Abdominals and obliques')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.equipment (name, description) VALUES
    ('Barbell', 'Standard Olympic or standard barbell'),
    ('Dumbbell', 'Pair of dumbbells'),
    ('Machine', 'Cable or plate-loaded machine'),
    ('Bodyweight', 'No equipment required'),
    ('Kettlebell', 'Standard kettlebell'),
    ('Resistance Band', 'Elastic resistance band')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.movement_patterns (name, description) VALUES
    ('Push', 'Pushing weight away from the body'),
    ('Pull', 'Pulling weight towards the body'),
    ('Hinge', 'Hinging at the hips'),
    ('Squat', 'Bending at knees and hips'),
    ('Lunge', 'Single leg split stance movement'),
    ('Carry', 'Loaded carrying movement')
ON CONFLICT (name) DO NOTHING;
