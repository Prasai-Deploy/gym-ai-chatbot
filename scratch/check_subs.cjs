const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSubs() {
  await c.connect();
  const res = await c.query('SELECT * FROM subscriptions;');
  console.log('Subscriptions:', res.rows);
  await c.end();
}

checkSubs();
