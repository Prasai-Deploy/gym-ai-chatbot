/**
 * run-pwa-migration.ts
 * Creates push_subscriptions and user_notification_settings tables.
 * Run: npx tsx run-pwa-migration.ts
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
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         INT   NOT NULL AUTO_INCREMENT,
      user_id    INT   NOT NULL,
      endpoint   TEXT  NOT NULL,
      p256dh     TEXT  NOT NULL,
      auth       TEXT  NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_push_endpoint (user_id, endpoint(255)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS user_notification_settings (
      id               INT      NOT NULL AUTO_INCREMENT,
      user_id          INT      NOT NULL UNIQUE,
      daily_reminder   TINYINT  DEFAULT 1,
      reminder_time    TIME     DEFAULT '08:00:00',
      streak_alerts    TINYINT  DEFAULT 1,
      badge_alerts     TINYINT  DEFAULT 1,
      weekly_summary   TINYINT  DEFAULT 1,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
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
