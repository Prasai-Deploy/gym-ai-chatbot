import pkg from 'pg';
const { Client } = pkg;
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
    
    const email = 'sagarpaswan2455@gmail.com';
    const role = 'super_admin';

    // Insert into admins table
    const result = await client.query(
      "INSERT INTO admins (email, name, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role RETURNING *",
      [email, 'Sagar', role]
    );
    
    console.log("Admin added/updated successfully:", result.rows[0]);
  } catch (err) {
    console.error("Error inserting admin:", err);
  } finally {
    await client.end();
  }
}

run();
