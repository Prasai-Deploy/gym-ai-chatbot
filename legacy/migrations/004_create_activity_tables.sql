-- ─────────────────────────────────────────────────────────────────────────────
-- Recent Activity Tracking Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id                   SERIAL        PRIMARY KEY,
  user_id              INT           NOT NULL,
  activity_type        VARCHAR(50)   NOT NULL, -- 'workout', 'diet', 'achievement', etc.
  activity_title       VARCHAR(255)  NOT NULL,
  activity_description TEXT,
  metadata_json        JSONB         DEFAULT NULL,
  created_at           TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_created ON activity_logs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_tracking_state (
  user_id               INT           PRIMARY KEY,
  latest_activity_id    INT           DEFAULT 0,
  unread_activity_count INT           DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
