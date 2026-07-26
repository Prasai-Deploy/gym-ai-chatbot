-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Water Log Tracking Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS water_logs (
  id             SERIAL        PRIMARY KEY,
  user_id        INT           NOT NULL,
  intake_amount  INT           NOT NULL, -- in ml
  intake_type    VARCHAR(50)   DEFAULT 'water',
  source         VARCHAR(50)   DEFAULT 'manual', -- 'manual', 'ai', 'system'
  created_at     TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_date ON water_logs (user_id, created_at);

CREATE TABLE IF NOT EXISTS water_goals (
  id               SERIAL        PRIMARY KEY,
  user_id          INT           NOT NULL,
  daily_goal       INT           NOT NULL, -- in ml
  generated_by_ai  SMALLINT      DEFAULT 0,
  goal_reason      VARCHAR(255)  DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_active ON water_goals (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_hydration_progress (
  user_id              INT           NOT NULL,
  date                 DATE          NOT NULL,
  total_consumed       INT           DEFAULT 0,
  daily_goal           INT           DEFAULT 2000,
  completion_percentage INT          DEFAULT 0,
  last_updated         TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
