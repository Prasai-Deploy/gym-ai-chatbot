-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Create workout_plans and workout_logs tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_plans (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  date        DATE         NOT NULL,
  focus       VARCHAR(100)          DEFAULT NULL,
  duration    VARCHAR(50)           DEFAULT NULL,
  exercises   JSON         NOT NULL,
  raw_prompt  TEXT                  DEFAULT NULL,
  created_at  DATETIME              DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wp_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workout_logs (
  id              INT           NOT NULL AUTO_INCREMENT,
  user_id         INT           NOT NULL,
  plan_id         INT                    DEFAULT NULL,
  date            DATE          NOT NULL,
  exercise_name   VARCHAR(255)           DEFAULT NULL,
  sets_done       TINYINT UNSIGNED       DEFAULT NULL,
  reps_done       VARCHAR(50)            DEFAULT NULL,
  weight_used     DECIMAL(6,2)           DEFAULT NULL,
  difficulty      TINYINT UNSIGNED       DEFAULT NULL,
  notes           TEXT                   DEFAULT NULL,
  logged_at       DATETIME               DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
