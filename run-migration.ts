/**
 * run-migration.ts
 * Run this once to create the progress dashboard tables.
 * npx tsx run-migration.ts
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  const conn = await mysql.createConnection({
    host: (process.env.DB_HOST || '').trim(),
    user: (process.env.DB_USER || '').trim(),
    password: (process.env.DB_PASSWORD || '').trim(),
    database: (process.env.DB_NAME || '').trim(),
    connectTimeout: 30000,
  });

  console.log('[migration] Connected to MySQL.');

  const statements = [
    `CREATE TABLE IF NOT EXISTS user_progress (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS nutrition_logs (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `DROP TABLE IF EXISTS workout_logs`,

    `CREATE TABLE workout_logs (
      id               INT                           NOT NULL AUTO_INCREMENT,
      user_id          INT                           NOT NULL,
      workout_name     VARCHAR(255)                  NOT NULL DEFAULT 'Workout',
      date             DATE                          NOT NULL,
      duration_minutes INT                                    DEFAULT 0,
      difficulty       ENUM('Easy','Medium','Hard')  NOT NULL DEFAULT 'Medium',
      created_at       DATETIME                               DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const sql of statements) {
    const label = sql.trim().split('\n')[0].slice(0, 60);
    try {
      await conn.execute(sql);
      console.log(`[migration] OK: ${label}`);
    } catch (e: any) {
      console.error(`[migration] ERR: ${e.message} | ${label}`);
    }
  }

  await conn.end();
  console.log('[migration] Done.');
})();
