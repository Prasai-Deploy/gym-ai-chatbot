-- ─────────────────────────────────────────────────────────────────────────────
-- Sweat Fix Gym — PostgreSQL Schema (Supabase)
-- Run this on your Supabase database to create all tables.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS allowed_users (
  id               SERIAL         PRIMARY KEY,
  email            VARCHAR(255)   UNIQUE NOT NULL,
  created_at       TIMESTAMPTZ    DEFAULT NOW()
);

INSERT INTO allowed_users (email)
VALUES
('user1@gmail.com'),
('user2@gmail.com'),
('user3@gmail.com'),
('demo@sweatfix.com')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL         PRIMARY KEY,
  google_id        VARCHAR(255)   UNIQUE,
  name             VARCHAR(255),
  email            VARCHAR(255),
  avatar           TEXT,
  profile_context  TEXT,
  chat_id          VARCHAR(255),
  password         VARCHAR(255),
  phone            VARCHAR(50)    UNIQUE,
  is_admin         BOOLEAN        DEFAULT FALSE,
  water_goal       INT            DEFAULT 2000,
  calorie_goal     INT            DEFAULT 0,
  protein_goal     INT            DEFAULT 0,
  carb_goal        INT            DEFAULT 0,
  fat_goal         INT            DEFAULT 0,
  created_at       TIMESTAMPTZ    DEFAULT NOW(),
  last_login       TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress (
  id            SERIAL  PRIMARY KEY,
  user_id       INT     REFERENCES users(id) ON DELETE CASCADE,
  date          DATE,
  workout_name  VARCHAR(255),
  calories      INT     DEFAULT 0,
  protein       INT     DEFAULT 0,
  water         INT     DEFAULT 0,
  carbs         INT     DEFAULT 0,
  fats          INT     DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id            SERIAL   PRIMARY KEY,
  user_id       INT      REFERENCES users(id) ON DELETE CASCADE,
  date          DATE,
  workout_plan  TEXT,
  diet_plan     TEXT,
  completed     SMALLINT DEFAULT 0,
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS fitness_profiles (
  id             SERIAL          PRIMARY KEY,
  user_id        INT             NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  goal           VARCHAR(100)    DEFAULT NULL,
  weight_kg      NUMERIC(5,2)    DEFAULT NULL,
  height_cm      NUMERIC(5,2)    DEFAULT NULL,
  age            SMALLINT        DEFAULT NULL,
  diet_type      VARCHAR(100)    DEFAULT NULL,
  activity_level VARCHAR(100)    DEFAULT NULL,
  workout_days   SMALLINT        DEFAULT NULL,
  notes          TEXT            DEFAULT NULL,
  updated_at     TIMESTAMPTZ     DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Workout Generator Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_plans (
  id                SERIAL       PRIMARY KEY,
  user_id           INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE         NOT NULL,
  focus             VARCHAR(100)          DEFAULT NULL,
  duration          VARCHAR(50)           DEFAULT NULL,
  exercises         JSONB        NOT NULL,
  calories_estimate INT                   DEFAULT 0,
  difficulty        VARCHAR(50)           DEFAULT 'Moderate',
  raw_prompt        TEXT                  DEFAULT NULL,
  created_at        TIMESTAMPTZ           DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Live Workout Tracking Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_sessions (
  id                  SERIAL        PRIMARY KEY,
  user_id             INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id             INT           NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  status              VARCHAR(20)   DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_time          TIMESTAMPTZ   DEFAULT NOW(),
  end_time            TIMESTAMPTZ   DEFAULT NULL,
  completed_exercises JSONB         DEFAULT NULL,
  progress_percentage INT           DEFAULT 0,
  calories_burned     INT           DEFAULT 0,
  created_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_progress (
  id              SERIAL        PRIMARY KEY,
  session_id      INT           NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name   VARCHAR(255)  NOT NULL,
  sets_completed  SMALLINT      DEFAULT 0,
  reps_done       VARCHAR(50)   DEFAULT NULL,
  weight_used     NUMERIC(6,2)  DEFAULT NULL,
  is_completed    BOOLEAN       DEFAULT FALSE,
  logged_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot_generated_plans (
  id              SERIAL        PRIMARY KEY,
  user_id         INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_json        TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id              SERIAL        PRIMARY KEY,
  user_id         INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id         INT                    DEFAULT NULL REFERENCES workout_plans(id) ON DELETE SET NULL,
  date            DATE          NOT NULL,
  exercise_name   VARCHAR(255)           DEFAULT NULL,
  workout_name    VARCHAR(255)           DEFAULT NULL,
  sets_done       SMALLINT               DEFAULT NULL,
  reps_done       VARCHAR(50)            DEFAULT NULL,
  weight_used     NUMERIC(6,2)           DEFAULT NULL,
  difficulty      SMALLINT               DEFAULT NULL,
  duration_minutes INT                   DEFAULT NULL,
  notes           TEXT                   DEFAULT NULL,
  logged_at       TIMESTAMPTZ            DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Progress Dashboard Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progress_logs (
  id           SERIAL       PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE         NOT NULL,
  weight_kg    NUMERIC(5,2)          DEFAULT NULL,
  body_fat_pct NUMERIC(4,1)          DEFAULT NULL,
  chest_cm     NUMERIC(5,1)          DEFAULT NULL,
  waist_cm     NUMERIC(5,1)          DEFAULT NULL,
  hips_cm      NUMERIC(5,1)          DEFAULT NULL,
  notes        TEXT                  DEFAULT NULL,
  logged_at    TIMESTAMPTZ           DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id           INT      PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_workouts    INT               DEFAULT 0,
  current_streak    INT               DEFAULT 0,
  longest_streak    INT               DEFAULT 0,
  last_workout_date DATE              DEFAULT NULL,
  updated_at        TIMESTAMPTZ       DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Nutrition Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_plans (
  id               SERIAL       PRIMARY KEY,
  user_id          INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE         NOT NULL,
  calories_target  INT          DEFAULT 0,
  meals            JSONB        DEFAULT NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id          SERIAL       PRIMARY KEY,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE         NOT NULL,
  food_item   VARCHAR(500) DEFAULT NULL,
  calories    INT          DEFAULT 0,
  protein     INT          DEFAULT 0,
  protein_g   NUMERIC(6,1) DEFAULT 0,
  carbs       INT          DEFAULT 0,
  carbs_g     NUMERIC(6,1) DEFAULT 0,
  fats        INT          DEFAULT 0,
  fat_g       NUMERIC(6,1) DEFAULT 0,
  logged_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Gamification Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_streaks (
  id               SERIAL       PRIMARY KEY,
  user_id          INT          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak   INT          DEFAULT 0,
  longest_streak   INT          DEFAULT 0,
  last_active_date DATE         DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  id         SERIAL       PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key  VARCHAR(100) NOT NULL,
  earned_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (user_id, badge_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Push Notification Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id       SERIAL       PRIMARY KEY,
  user_id  INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT         NOT NULL UNIQUE,
  p256dh   TEXT         NOT NULL,
  auth     TEXT         NOT NULL
);

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id              SERIAL      PRIMARY KEY,
  user_id         INT         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_reminder  SMALLINT    DEFAULT 1,
  reminder_time   TIME        DEFAULT '08:00:00',
  streak_alerts   SMALLINT    DEFAULT 1,
  badge_alerts    SMALLINT    DEFAULT 1,
  weekly_summary  SMALLINT    DEFAULT 1
);

-- ─────────────────────────────────────────────────────────────────────────────
-- User Progress (Activity Tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_progress (
  id               SERIAL       PRIMARY KEY,
  user_id          INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE         NOT NULL,
  activity_minutes INT          DEFAULT 0,
  calories_burned  INT          DEFAULT 0,
  water_litres     NUMERIC(4,2) DEFAULT 0,
  protein_g        NUMERIC(6,1) DEFAULT 0,
  carbs_g          NUMERIC(6,1) DEFAULT 0,
  fat_g            NUMERIC(6,1) DEFAULT 0,
  UNIQUE (user_id, date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers: auto-update updated_at columns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_fitness_profiles_updated_at
  BEFORE UPDATE ON fitness_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
