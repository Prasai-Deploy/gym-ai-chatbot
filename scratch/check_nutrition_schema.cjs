const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function check() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const res = await c.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'v2_nutrition_logs'
    ORDER BY ordinal_position
  `);
  console.log('--- Columns of public.v2_nutrition_logs ---');
  console.table(res.rows);

  const resLegacy = await c.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nutrition_logs'
    ORDER BY ordinal_position
  `);
  console.log('--- Columns of legacy public.nutrition_logs (if exists) ---');
  console.table(resLegacy.rows);

  await c.end();
}
check().catch(console.error);
