-- 005_nutrition_system.sql
-- Nutrition logs and meal plans tables

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id           SERIAL       PRIMARY KEY,
  user_id      INT          NOT NULL,
  date         DATE         NOT NULL,
  food_item    VARCHAR(255) NOT NULL,
  calories     INT          DEFAULT 0,
  protein      INT          DEFAULT 0,
  carbs        INT          DEFAULT 0,
  fats         INT          DEFAULT 0,
  logged_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id              SERIAL       PRIMARY KEY,
  user_id         INT          NOT NULL,
  date            DATE         NOT NULL,
  calories_target INT          NOT NULL,
  meals           JSONB        NOT NULL,
  created_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_mp_user_date UNIQUE (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
