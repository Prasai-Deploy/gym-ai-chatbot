/**
 * run-gamification-migration.ts
 * Creates user_streaks and user_badges tables.
 * Run: npx tsx run-gamification-migration.ts
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
  console.log('[migration] Connected.');

  const statements = [
    `CREATE TABLE IF NOT EXISTS user_streaks (
      id               INT      NOT NULL AUTO_INCREMENT,
      user_id          INT      NOT NULL UNIQUE,
      current_streak   INT               DEFAULT 0,
      longest_streak   INT               DEFAULT 0,
      last_active_date DATE              DEFAULT NULL,
      updated_at       DATETIME          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS user_badges (
      id         INT      NOT NULL AUTO_INCREMENT,
      user_id    INT      NOT NULL,
      badge_key  VARCHAR(64) NOT NULL,
      earned_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_badge (user_id, badge_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const sql of statements) {
    const label = sql.trim().split('\n')[0].slice(0, 70);
    try {
      await conn.execute(sql);
      console.log(`[migration] OK  : ${label}`);
    } catch (e: any) {
      console.error(`[migration] ERR : ${e.message} | ${label}`);
    }
  }

  await conn.end();
  console.log('[migration] Done.');
})();
