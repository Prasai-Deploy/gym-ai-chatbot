import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runMigration() {
  const migrationFile = process.argv[2] || "003_create_ai_plan_tables.sql";
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  try {
    const migrationPath = path.join(__dirname, "..", "migrations", migrationFile);
    const sql = fs.readFileSync(migrationPath, "utf8");
    
    console.log(`Running migration: ${migrationFile}...`);
    await pool.query(sql);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
