-- Migration 006: Workout Tracker Redesign
-- Adds new fields to workout_plans and creates sessions/progress tracking tables.

ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS calories_estimate INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Moderate';

CREATE TABLE IF NOT EXISTS workout_sessions (
  id                  SERIAL        PRIMARY KEY,
  user_id             INT           NOT NULL,
  plan_id             INT           NOT NULL,
  status              VARCHAR(20)   DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_time          TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  end_time            TIMESTAMPTZ   DEFAULT NULL,
  completed_exercises JSONB         DEFAULT NULL, 
  progress_percentage INT           DEFAULT 0,
  calories_burned     INT           DEFAULT 0,
  created_at          TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workout_progress (
  id              SERIAL        PRIMARY KEY,
  session_id      INT           NOT NULL,
  exercise_name   VARCHAR(255)  NOT NULL,
  sets_completed  SMALLINT      DEFAULT 0,
  reps_done       VARCHAR(50)   DEFAULT NULL,
  weight_used     NUMERIC(6,2)  DEFAULT NULL,
  is_completed    BOOLEAN       DEFAULT FALSE,
  logged_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chatbot_generated_plans (
  id              SERIAL        PRIMARY KEY,
  user_id         INT           NOT NULL,
  raw_json        TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
