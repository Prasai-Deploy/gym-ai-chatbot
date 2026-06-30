-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Create progress_logs and user_stats tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Body-weight and measurement snapshots over time
CREATE TABLE IF NOT EXISTS progress_logs (
  id           SERIAL       PRIMARY KEY,
  user_id      INT          NOT NULL,
  date         DATE         NOT NULL,
  weight_kg    NUMERIC(5,2)          DEFAULT NULL,
  body_fat_pct NUMERIC(4,1)          DEFAULT NULL,
  chest_cm     NUMERIC(5,1)          DEFAULT NULL,
  waist_cm     NUMERIC(5,1)          DEFAULT NULL,
  hips_cm      NUMERIC(5,1)          DEFAULT NULL,
  notes        TEXT                  DEFAULT NULL,
  logged_at    TIMESTAMPTZ           DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_pl_user_date UNIQUE (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cached aggregate stats (rebuilt on each dashboard request)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id           INT      PRIMARY KEY,
  total_workouts    INT               DEFAULT 0,
  current_streak    INT               DEFAULT 0,
  longest_streak    INT               DEFAULT 0,
  last_workout_date DATE              DEFAULT NULL,
  updated_at        TIMESTAMPTZ       DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
