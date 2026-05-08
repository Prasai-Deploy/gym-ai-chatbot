-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Water Log Tracking Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS water_logs (
  id             INT           NOT NULL AUTO_INCREMENT,
  user_id        INT           NOT NULL,
  intake_amount  INT           NOT NULL, -- in ml
  intake_type    VARCHAR(50)   DEFAULT 'water',
  source         VARCHAR(50)   DEFAULT 'manual', -- 'manual', 'ai', 'system'
  created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_date (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS water_goals (
  id               INT           NOT NULL AUTO_INCREMENT,
  user_id          INT           NOT NULL,
  daily_goal       INT           NOT NULL, -- in ml
  generated_by_ai  TINYINT(1)    DEFAULT 0,
  goal_reason      VARCHAR(255)  DEFAULT NULL,
  created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_active (user_id, created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_hydration_progress (
  user_id              INT           NOT NULL,
  date                 DATE          NOT NULL,
  total_consumed       INT           DEFAULT 0,
  daily_goal           INT           DEFAULT 2000,
  completion_percentage INT          DEFAULT 0,
  last_updated         DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
