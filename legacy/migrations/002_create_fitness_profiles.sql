-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — fitness_profiles table
-- Structured fitness data linked 1-to-1 with users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitness_profiles (
  id             SERIAL           PRIMARY KEY,
  user_id        INT              NOT NULL UNIQUE,
  goal           VARCHAR(100)     DEFAULT NULL,   -- e.g. "muscle gain", "weight loss"
  weight_kg      NUMERIC(5,2)     DEFAULT NULL,   -- current weight
  height_cm      NUMERIC(5,2)     DEFAULT NULL,
  age            SMALLINT         DEFAULT NULL,
  diet_type      VARCHAR(100)     DEFAULT NULL,   -- e.g. "vegetarian", "keto"
  activity_level VARCHAR(100)     DEFAULT NULL,   -- "sedentary" → "very active"
  workout_days   SMALLINT         DEFAULT NULL,   -- 1–7
  notes          TEXT             DEFAULT NULL,   -- free-form additional context
  updated_at     TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
