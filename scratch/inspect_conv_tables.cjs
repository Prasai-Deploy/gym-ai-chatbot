const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectConversations() {
  await c.connect();
  const res = await c.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'ai_conversations'
    ORDER BY ordinal_position;
  `);
  console.log('ai_conversations columns:');
  console.table(res.rows);

  const res2 = await c.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'ai_messages'
    ORDER BY ordinal_position;
  `);
  console.log('ai_messages columns:');
  console.table(res2.rows);

  await c.end();
}

inspectConversations();
