/**
 * migrations/run_migration.js
 * Runs all SQL migration files in the migrations/ directory in filename order.
 * Usage:  node migrations/run_migration.js
 */
import mysql from "mysql2/promise";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

async function runMigrations() {
  const pool = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  console.log("[Migrations] Connected to MySQL.");

  // Ensure a tracking table exists
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       VARCHAR(255) PRIMARY KEY,
      run_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Read all .sql files sorted alphabetically
  const files = readdirSync(__dirname)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    // Skip already-applied migrations
    const [rows] = await pool.execute(
      "SELECT name FROM _migrations WHERE name = ?",
      [file]
    );
    if ((rows).length > 0) {
      console.log(`[Migrations] Skipping ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(__dirname, file), "utf8");
    console.log(`[Migrations] Running ${file}...`);
    await pool.query(sql);
    await pool.execute("INSERT INTO _migrations (name) VALUES (?)", [file]);
    console.log(`[Migrations] ✓ ${file} applied.`);
  }

  await pool.end();
  console.log("[Migrations] All migrations complete.");
}

runMigrations().catch((err) => {
  console.error("[Migrations] FAILED:", err.message);
  process.exit(1);
});
