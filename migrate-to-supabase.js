/**
 * migrate-to-supabase.js
 * One-time script to create all PostgreSQL tables on Supabase.
 * 
 * Usage: node migrate-to-supabase.js
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }

  console.log("🔌 Connecting to Supabase PostgreSQL...");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to Supabase.");

    // Read the schema file
    const schemaPath = path.join(__dirname, "schema-postgres.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    console.log("📄 Running schema-postgres.sql...");
    await client.query(schema);
    console.log("✅ All tables created successfully!");

    // Verify by listing tables
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`\n📋 Tables in database (${rows.length}):`);
    rows.forEach((r) => console.log(`   • ${r.table_name}`));
    console.log("\n🎉 Migration complete! You can now start the app with 'npm run dev'.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    if (err.detail) console.error("   Detail:", err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
