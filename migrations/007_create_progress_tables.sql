-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Create weekly_progress and daily_fitness_stats tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Weekly/Daily granular activity summary
CREATE TABLE IF NOT EXISTS weekly_progress (
  id                   SERIAL    PRIMARY KEY,
  user_id              INT       NOT NULL,
  date                 DATE      NOT NULL,
  workouts_completed   INT       DEFAULT 0,
  exercises_completed  INT       DEFAULT 0,
  calories_burned      INT       DEFAULT 0,
  workout_duration     INT       DEFAULT 0, -- in minutes
  hydration_completion INT       DEFAULT 0, -- 0-100 percentage
  diet_completion      INT       DEFAULT 0, -- 0-100 percentage
  streak_value         INT       DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_wp_user_date UNIQUE (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Real-time user fitness status
CREATE TABLE IF NOT EXISTS daily_fitness_stats (
  user_id                   INT      PRIMARY KEY,
  daily_progress_percentage INT      DEFAULT 0,
  active_minutes            INT      DEFAULT 0,
  completed_goals           INT      DEFAULT 0,
  updated_at                TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
