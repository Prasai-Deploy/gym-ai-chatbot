import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");
    
    const sql = fs.readFileSync(path.join(__dirname, '..', 'schema-postgres.sql'), 'utf8');
    await client.query(sql);
    console.log("Schema executed successfully.");
  } catch (err) {
    console.error("Error executing schema:", err);
  } finally {
    await client.end();
  }
}

run();
