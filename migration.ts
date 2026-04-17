import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 3306,
  });

  const connection = await pool.getConnection();
  console.log("Connected to database for migration...");

  try {
    // 1. Add columns to users if they don't exist
    const [columns] = await connection.execute("SHOW COLUMNS FROM users");
    const columnNames = (columns as any[]).map(c => c.Field);

    const newColumns = [
      { name: "age", type: "INT DEFAULT NULL" },
      { name: "weight", type: "FLOAT DEFAULT NULL" },
      { name: "height", type: "FLOAT DEFAULT NULL" },
      { name: "gender", type: "VARCHAR(20) DEFAULT NULL" },
      { name: "fitness_goal", type: "VARCHAR(100) DEFAULT NULL" },
      { name: "role", type: "ENUM('free', 'premium', 'admin') DEFAULT 'free'" },
      { name: "streak", type: "INT DEFAULT 0" },
      { name: "last_activity", type: "DATE DEFAULT NULL" }
    ];

    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await connection.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 2. Create food_logs table
    console.log("Creating food_logs table if not exists...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS food_logs (
        id            INT            NOT NULL AUTO_INCREMENT,
        user_id       INT            NOT NULL,
        food_name     VARCHAR(255)   NOT NULL,
        calories      INT            DEFAULT 0,
        protein       INT            DEFAULT 0,
        carbs         INT            DEFAULT 0,
        fats          INT            DEFAULT 0,
        meal_type     VARCHAR(50),
        logged_at     DATETIME       DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create achievements table
    console.log("Creating achievements table if not exists...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS achievements (
        id            INT            NOT NULL AUTO_INCREMENT,
        user_id       INT            NOT NULL,
        badge_name    VARCHAR(255)   NOT NULL,
        badge_icon    VARCHAR(255),
        earned_at     DATETIME       DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration FAILED:", err);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
