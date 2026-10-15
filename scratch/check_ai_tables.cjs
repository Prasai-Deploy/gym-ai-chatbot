const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await c.connect();
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name");
  console.log('AI tables in public:', r.rows.map(x => x.table_name));
  await c.end();
}

check();
