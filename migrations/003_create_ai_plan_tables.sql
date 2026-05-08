-- ─────────────────────────────────────────────────────────────────────────────
-- AI Workout & Diet Integration Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chatbot_generated_workouts (
  id                INT          NOT NULL AUTO_INCREMENT,
  user_id           INT          NOT NULL,
  plan_id           VARCHAR(50)           DEFAULT NULL,
  generated_by_ai   TINYINT(1)            DEFAULT 1,
  title             VARCHAR(255)          DEFAULT 'AI Workout Plan',
  exercises         JSON         NOT NULL,
  duration          VARCHAR(50)           DEFAULT NULL,
  difficulty        VARCHAR(50)           DEFAULT 'Moderate',
  calories_estimate INT                   DEFAULT 0,
  created_at        DATETIME              DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chatbot_generated_diets (
  id                INT          NOT NULL AUTO_INCREMENT,
  user_id           INT          NOT NULL,
  plan_id           VARCHAR(50)           DEFAULT NULL,
  generated_by_ai   TINYINT(1)            DEFAULT 1,
  title             VARCHAR(255)          DEFAULT 'AI Diet Plan',
  meals             JSON         NOT NULL,
  calories_target   INT                   DEFAULT 0,
  protein           INT                   DEFAULT 0,
  carbs             INT                   DEFAULT 0,
  fats              INT                   DEFAULT 0,
  created_at        DATETIME              DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_fitness_plans (
  id                INT          NOT NULL AUTO_INCREMENT,
  user_id           INT          NOT NULL,
  workout_plan_id   INT                   DEFAULT NULL,
  diet_plan_id      INT                   DEFAULT NULL,
  active            TINYINT(1)            DEFAULT 1,
  created_at        DATETIME              DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_plan_id) REFERENCES chatbot_generated_workouts(id) ON DELETE SET NULL,
  FOREIGN KEY (diet_plan_id) REFERENCES chatbot_generated_diets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_meal_tracking (
  id                INT          NOT NULL AUTO_INCREMENT,
  user_id           INT          NOT NULL,
  date              DATE         NOT NULL,
  meal_type         VARCHAR(50)           DEFAULT NULL,
  food_item         VARCHAR(255)          DEFAULT NULL,
  calories          INT                   DEFAULT 0,
  protein           INT                   DEFAULT 0,
  carbs             INT                   DEFAULT 0,
  fats              INT                   DEFAULT 0,
  created_at        DATETIME              DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_progress (
  id                  INT        NOT NULL AUTO_INCREMENT,
  user_id             INT        NOT NULL,
  date                DATE       NOT NULL,
  calories_consumed   INT                   DEFAULT 0,
  calories_burned     INT                   DEFAULT 0,
  water_ml            INT                   DEFAULT 0,
  completed_percentage INT                  DEFAULT 0,
  weight_kg           DECIMAL(5,2)          DEFAULT NULL,
  created_at          DATETIME              DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
