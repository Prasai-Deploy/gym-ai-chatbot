/**
 * migrations/run_migration.js
 * Runs all SQL migration files in the migrations/ directory in filename order.
 * Usage:  node migrations/run_migration.js
 */
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const { Pool } = pg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

async function runMigrations() {
  const connectionOptions = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     Number(process.env.DB_PORT) || 5432,
      };

  // Enable SSL if connecting to a Supabase host
  if (
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("supabase.co")) ||
    (process.env.DB_HOST && process.env.DB_HOST.includes("supabase.co"))
  ) {
    connectionOptions.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(connectionOptions);

  try {
    console.log("[Migrations] Connecting to PostgreSQL database...");
    // Test connectivity
    await pool.query("SELECT NOW()");
    console.log("[Migrations] Connected to PostgreSQL.");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name       VARCHAR(255) PRIMARY KEY,
        run_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = readdirSync(__dirname)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const res = await pool.query(
        "SELECT name FROM _migrations WHERE name = $1",
        [file]
      );
      if (res.rows.length > 0) {
        console.log(`[Migrations] Skipping ${file} (already applied)`);
        continue;
      }

      const sql = readFileSync(join(__dirname, file), "utf8");
      console.log(`[Migrations] Running ${file}...`);
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      console.log(`[Migrations] ✓ ${file} applied.`);
    }

    console.log("[Migrations] All migrations complete.");
  } catch (err) {
    console.error("[Migrations] Error encountered during migrations:", err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("[Migrations] FAILED:", err.message);
  process.exit(1);
});
