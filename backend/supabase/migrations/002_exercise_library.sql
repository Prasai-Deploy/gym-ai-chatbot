-- ==========================================
-- SPRINT 4D1: EXERCISE LIBRARY MIGRATION
-- ==========================================

-- ENUMS
CREATE TYPE exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

-- 1. LOOKUP TABLES
CREATE TABLE public.exercise_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.muscle_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.movement_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g. Push, Pull, Hinge
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.exercise_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g. Strength, Cardio, Mobility
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.exercise_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. CORE EXERCISES TABLE
CREATE TABLE public.exercises (
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
CREATE TABLE public.exercise_muscles (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    muscle_group_id UUID REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE TABLE public.exercise_equipment (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, equipment_id)
);

CREATE TABLE public.exercise_tags_map (
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.exercise_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, tag_id)
);

CREATE TABLE public.exercise_variations (
    base_exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    variation_exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
    PRIMARY KEY (base_exercise_id, variation_exercise_id),
    CHECK (base_exercise_id != variation_exercise_id)
);

CREATE TABLE public.exercise_alternatives (
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
