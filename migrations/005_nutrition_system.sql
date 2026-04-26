-- 005_nutrition_system.sql
-- Nutrition logs and meal plans tables

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id           INT          NOT NULL AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  date         DATE         NOT NULL,
  food_item    VARCHAR(255) NOT NULL,
  calories     INT          DEFAULT 0,
  protein      INT          DEFAULT 0,
  carbs        INT          DEFAULT 0,
  fats         INT          DEFAULT 0,
  logged_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meal_plans (
  id              INT          NOT NULL AUTO_INCREMENT,
  user_id         INT          NOT NULL,
  date            DATE         NOT NULL,
  calories_target INT          NOT NULL,
  meals           JSON         NOT NULL,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mp_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
