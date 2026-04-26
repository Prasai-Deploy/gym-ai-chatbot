-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — fitness_profiles table
-- Structured fitness data linked 1-to-1 with users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitness_profiles (
  id             INT              NOT NULL AUTO_INCREMENT,
  user_id        INT              NOT NULL UNIQUE,
  goal           VARCHAR(100)     DEFAULT NULL,   -- e.g. "muscle gain", "weight loss"
  weight_kg      DECIMAL(5,2)     DEFAULT NULL,   -- current weight
  height_cm      DECIMAL(5,2)     DEFAULT NULL,
  age            TINYINT UNSIGNED DEFAULT NULL,
  diet_type      VARCHAR(100)     DEFAULT NULL,   -- e.g. "vegetarian", "keto"
  activity_level VARCHAR(100)     DEFAULT NULL,   -- "sedentary" → "very active"
  workout_days   TINYINT UNSIGNED DEFAULT NULL,   -- 1–7
  notes          TEXT             DEFAULT NULL,   -- free-form additional context
  updated_at     DATETIME         DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
