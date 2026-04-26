-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Create progress_logs and user_stats tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Body-weight and measurement snapshots over time
CREATE TABLE IF NOT EXISTS progress_logs (
  id           INT          NOT NULL AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  date         DATE         NOT NULL,
  weight_kg    DECIMAL(5,2)          DEFAULT NULL,
  body_fat_pct DECIMAL(4,1)          DEFAULT NULL,
  chest_cm     DECIMAL(5,1)          DEFAULT NULL,
  waist_cm     DECIMAL(5,1)          DEFAULT NULL,
  hips_cm      DECIMAL(5,1)          DEFAULT NULL,
  notes        TEXT                  DEFAULT NULL,
  logged_at    DATETIME              DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pl_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cached aggregate stats (rebuilt on each dashboard request)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id           INT      NOT NULL,
  total_workouts    INT               DEFAULT 0,
  current_streak    INT               DEFAULT 0,
  longest_streak    INT               DEFAULT 0,
  last_workout_date DATE              DEFAULT NULL,
  updated_at        DATETIME          DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
