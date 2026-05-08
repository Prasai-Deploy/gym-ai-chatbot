-- ─────────────────────────────────────────────────────────────────────────────
-- Recent Activity Tracking Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id                   INT           NOT NULL AUTO_INCREMENT,
  user_id              INT           NOT NULL,
  activity_type        VARCHAR(50)   NOT NULL, -- 'workout', 'diet', 'achievement', etc.
  activity_title       VARCHAR(255)  NOT NULL,
  activity_description TEXT,
  metadata_json        JSON          DEFAULT NULL,
  created_at           DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_created (user_id, created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activity_tracking_state (
  user_id               INT           NOT NULL,
  latest_activity_id    INT           DEFAULT 0,
  unread_activity_count INT           DEFAULT 0,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
