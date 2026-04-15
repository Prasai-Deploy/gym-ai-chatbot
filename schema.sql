-- ─────────────────────────────────────────────────────────────────────────────
-- Sweat Fix Gym — MySQL Schema
-- Run this on your Hostinger MySQL database if the tables don't exist yet.
-- All tables use utf8mb4 with InnoDB engine.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id               INT            NOT NULL AUTO_INCREMENT,
  google_id        VARCHAR(255)   UNIQUE,
  name             VARCHAR(255),
  email            VARCHAR(255),
  avatar           TEXT,
  profile_context  TEXT,
  chat_id          VARCHAR(255),
  password         VARCHAR(255),
  phone            VARCHAR(50)    UNIQUE,
  water_goal       INT            DEFAULT 2000,
  calorie_goal     INT            DEFAULT 0,
  protein_goal     INT            DEFAULT 0,
  carb_goal        INT            DEFAULT 0,
  fat_goal         INT            DEFAULT 0,
  created_at       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  last_login       DATETIME       DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS progress (
  id            INT  NOT NULL AUTO_INCREMENT,
  user_id       INT,
  date          DATE,
  workout_name  VARCHAR(255),
  calories      INT  DEFAULT 0,
  protein       INT  DEFAULT 0,
  water         INT  DEFAULT 0,
  carbs         INT  DEFAULT 0,
  fats          INT  DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_plans (
  id            INT      NOT NULL AUTO_INCREMENT,
  user_id       INT,
  date          DATE,
  workout_plan  TEXT,
  diet_plan     TEXT,
  completed     TINYINT  DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
