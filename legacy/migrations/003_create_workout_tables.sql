-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Create workout_plans and workout_logs tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_plans (
  id          SERIAL       PRIMARY KEY,
  user_id     INT          NOT NULL,
  date        DATE         NOT NULL,
  focus       VARCHAR(100)          DEFAULT NULL,
  duration    VARCHAR(50)           DEFAULT NULL,
  exercises   JSONB        NOT NULL,
  raw_prompt  TEXT                  DEFAULT NULL,
  created_at  TIMESTAMPTZ           DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_wp_user_date UNIQUE (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id              SERIAL        PRIMARY KEY,
  user_id         INT           NOT NULL,
  plan_id         INT                    DEFAULT NULL,
  date            DATE          NOT NULL,
  exercise_name   VARCHAR(255)           DEFAULT NULL,
  sets_done       SMALLINT               DEFAULT NULL,
  reps_done       VARCHAR(50)            DEFAULT NULL,
  weight_used     NUMERIC(6,2)           DEFAULT NULL,
  difficulty      SMALLINT               DEFAULT NULL,
  notes           TEXT                   DEFAULT NULL,
  logged_at       TIMESTAMPTZ            DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
);
