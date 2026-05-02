-- ─────────────────────────────────────────────────────────────────────────────
-- Progress Dashboard Migration
-- Run on Hostinger MySQL database
-- ─────────────────────────────────────────────────────────────────────────────

-- Daily activity tracking (for weekly bar chart)
CREATE TABLE IF NOT EXISTS user_progress (
  id               INT           NOT NULL AUTO_INCREMENT,
  user_id          INT           NOT NULL,
  date             DATE          NOT NULL,
  activity_minutes INT                    DEFAULT 0,
  calories_burned  INT                    DEFAULT 0,
  water_litres     DECIMAL(4,2)           DEFAULT 0,
  created_at       DATETIME               DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_up_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nutrition intake logs
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id         INT     NOT NULL AUTO_INCREMENT,
  user_id    INT     NOT NULL,
  date       DATE    NOT NULL,
  protein_g  INT              DEFAULT 0,
  carbs_g    INT              DEFAULT 0,
  fat_g      INT              DEFAULT 0,
  calories   INT              DEFAULT 0,
  created_at DATETIME         DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nl_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drop the old workout_logs and recreate with the new simple schema
DROP TABLE IF EXISTS workout_logs;

CREATE TABLE workout_logs (
  id               INT                           NOT NULL AUTO_INCREMENT,
  user_id          INT                           NOT NULL,
  workout_name     VARCHAR(255)                  NOT NULL DEFAULT 'Workout',
  date             DATE                          NOT NULL,
  duration_minutes INT                                    DEFAULT 0,
  difficulty       ENUM('Easy','Medium','Hard')  NOT NULL DEFAULT 'Medium',
  created_at       DATETIME                               DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
