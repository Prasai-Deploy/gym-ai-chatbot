-- Migration 006: Workout Tracker Redesign
-- Adds new fields to workout_plans and creates sessions/progress tracking tables.

ALTER TABLE workout_plans 
ADD COLUMN calories_estimate INT DEFAULT 0,
ADD COLUMN difficulty VARCHAR(50) DEFAULT 'Moderate';

CREATE TABLE IF NOT EXISTS workout_sessions (
  id                  INT           NOT NULL AUTO_INCREMENT,
  user_id             INT           NOT NULL,
  plan_id             INT           NOT NULL,
  status              ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  start_time          DATETIME      DEFAULT CURRENT_TIMESTAMP,
  end_time            DATETIME      DEFAULT NULL,
  completed_exercises JSON          DEFAULT NULL, 
  progress_percentage INT           DEFAULT 0,
  calories_burned     INT           DEFAULT 0,
  created_at          DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workout_progress (
  id              INT           NOT NULL AUTO_INCREMENT,
  session_id      INT           NOT NULL,
  exercise_name   VARCHAR(255)  NOT NULL,
  sets_completed  TINYINT UNSIGNED DEFAULT 0,
  reps_done       VARCHAR(50)   DEFAULT NULL,
  weight_used     DECIMAL(6,2)  DEFAULT NULL,
  is_completed    TINYINT(1)    DEFAULT 0,
  logged_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chatbot_generated_plans (
  id              INT           NOT NULL AUTO_INCREMENT,
  user_id         INT           NOT NULL,
  raw_json        TEXT          NOT NULL,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
