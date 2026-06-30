-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Add macro columns to user_progress + create ai_chat_logs table
-- ─────────────────────────────────────────────────────────────────────────────

-- Add protein, carbs, fats accumulation columns to user_progress
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS protein NUMERIC(7,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carbs   NUMERIC(7,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fats    NUMERIC(7,2) DEFAULT 0;

-- AI memory / chat context log — stores every extraction for audit & deduplication
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id            SERIAL        PRIMARY KEY,
  user_id       INT           NOT NULL,
  date          DATE          NOT NULL,
  data_type     VARCHAR(50)   NOT NULL, -- 'workout', 'nutrition', 'hydration', 'weight', 'cardio', 'plan', 'profile'
  data_key      VARCHAR(255)  DEFAULT NULL, -- e.g. workout name, food item (for dedup checks)
  data_json     JSONB         NOT NULL,     -- full parsed payload
  source        VARCHAR(50)   DEFAULT 'chat',
  created_at    TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY   (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_acl_user_date ON ai_chat_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_acl_user_type_key ON ai_chat_logs (user_id, date, data_type, data_key);
