const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProfiles() {
  await c.connect();
  const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;");
  console.log('Profiles columns:', cols.rows);

  const sample = await c.query('SELECT * FROM profiles LIMIT 5;');
  console.log('Sample profiles:', sample.rows);
  await c.end();
}

checkProfiles();
