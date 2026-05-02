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

CREATE TABLE IF NOT EXISTS fitness_profiles (
  id             INT              NOT NULL AUTO_INCREMENT,
  user_id        INT              NOT NULL UNIQUE,
  goal           VARCHAR(100)     DEFAULT NULL,
  weight_kg      DECIMAL(5,2)     DEFAULT NULL,
  height_cm      DECIMAL(5,2)     DEFAULT NULL,
  age            TINYINT UNSIGNED DEFAULT NULL,
  diet_type      VARCHAR(100)     DEFAULT NULL,
  activity_level VARCHAR(100)     DEFAULT NULL,
  workout_days   TINYINT UNSIGNED DEFAULT NULL,
  notes          TEXT             DEFAULT NULL,
  updated_at     DATETIME         DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- Workout Generator Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_plans (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  date        DATE         NOT NULL,
  focus       VARCHAR(100)          DEFAULT NULL,   -- e.g. "Push Day"
  duration    VARCHAR(50)           DEFAULT NULL,   -- e.g. "45 min"
  exercises   JSON         NOT NULL,                -- structured exercise array
  raw_prompt  TEXT                  DEFAULT NULL,   -- AI prompt used (debug)
  created_at  DATETIME              DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wp_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workout_logs (
  id              INT           NOT NULL AUTO_INCREMENT,
  user_id         INT           NOT NULL,
  plan_id         INT                    DEFAULT NULL,
  date            DATE          NOT NULL,
  exercise_name   VARCHAR(255)           DEFAULT NULL,
  sets_done       TINYINT UNSIGNED       DEFAULT NULL,
  reps_done       VARCHAR(50)            DEFAULT NULL,
  weight_used     DECIMAL(6,2)           DEFAULT NULL,
  difficulty      TINYINT UNSIGNED       DEFAULT NULL,  -- 1 (easy) – 5 (very hard)
  notes           TEXT                   DEFAULT NULL,
  logged_at       DATETIME               DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- Progress Dashboard Tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Body weight and measurement snapshots over time
CREATE TABLE IF NOT EXISTS progress_logs (
  id           INT          NOT NULL AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  date         DATE         NOT NULL,
  weight_kg    DECIMAL(5,2)          DEFAULT NULL,
  body_fat_pct DECIMAL(4,1)          DEFAULT NULL,
  chest_cm     DECIMAL(5,1)          DEFAULT NULL,
  waist_cm     DECIMAL(5,1)          DEFAULT NULL,
  hips_cm      DECIMAL(5,1)          DEFAULT NULL,
  notes        TEXT                  DEFAULT NULL,
  logged_at    DATETIME              DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pl_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cached aggregate stats rebuilt on each dashboard request
CREATE TABLE IF NOT EXISTS user_stats (
  user_id           INT      NOT NULL,
  total_workouts    INT               DEFAULT 0,
  current_streak    INT               DEFAULT 0,
  longest_streak    INT               DEFAULT 0,
  last_workout_date DATE              DEFAULT NULL,
  updated_at        DATETIME          DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Profiles (AI Coaching Memory)
CREATE TABLE IF NOT EXISTS user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  goal VARCHAR(100),
  gender VARCHAR(20),
  age INT,
  weight_kg INT,
  height_cm INT,
  activity_level VARCHAR(50),
  focus_areas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
