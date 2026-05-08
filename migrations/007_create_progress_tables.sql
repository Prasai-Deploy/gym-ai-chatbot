-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Create weekly_progress and daily_fitness_stats tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Weekly/Daily granular activity summary
CREATE TABLE IF NOT EXISTS weekly_progress (
  id                   INT NOT NULL AUTO_INCREMENT,
  user_id              INT NOT NULL,
  date                 DATE NOT NULL,
  workouts_completed   INT DEFAULT 0,
  exercises_completed  INT DEFAULT 0,
  calories_burned      INT DEFAULT 0,
  workout_duration     INT DEFAULT 0, -- in minutes
  hydration_completion INT DEFAULT 0, -- 0-100 percentage
  diet_completion      INT DEFAULT 0, -- 0-100 percentage
  streak_value         INT DEFAULT 0,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wp_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Real-time user fitness status
CREATE TABLE IF NOT EXISTS daily_fitness_stats (
  user_id                   INT NOT NULL,
  daily_progress_percentage INT DEFAULT 0,
  active_minutes            INT DEFAULT 0,
  completed_goals           INT DEFAULT 0,
  updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
