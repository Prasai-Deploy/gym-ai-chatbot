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

    const sql = `
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION update_membership_statuses()
RETURNS void AS $$
BEGIN
  -- Mark expired
  UPDATE memberships
  SET status = 'expired'
  WHERE expiry_date < CURRENT_DATE
  AND status != 'expired';

  -- Mark due soon (expiring within 7 days)
  UPDATE memberships
  SET status = 'due_soon'
  WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND status = 'active';

  -- When expired: deactivate workout and diet assignments for non-PT members
  UPDATE user_workout_assignments
  SET active = false
  WHERE user_id IN (
    SELECT m.user_id FROM memberships m
    JOIN membership_plans mp ON m.plan_id = mp.id
    WHERE m.status = 'expired'
    AND mp.name NOT ILIKE '%personal%'
  );

  UPDATE user_diet_assignments
  SET active = false
  WHERE user_id IN (
    SELECT m.user_id FROM memberships m
    JOIN membership_plans mp ON m.plan_id = mp.id
    WHERE m.status = 'expired'
    AND mp.name NOT ILIKE '%personal%'
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule it to run every day at midnight
SELECT cron.schedule('update-membership-statuses', '0 0 * * *', 'SELECT update_membership_statuses()');
    `;
    
    await client.query(sql);
    console.log("Successfully created function and cron schedule.");
  } catch (err) {
    console.error("Error setting up cron:", err);
  } finally {
    await client.end();
  }
}

run();
