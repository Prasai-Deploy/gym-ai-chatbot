const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectChatLogs() {
  await c.connect();
  const res = await c.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'ai_chat_logs'
    ORDER BY ordinal_position;
  `);
  console.log('ai_chat_logs columns:');
  console.table(res.rows);
  await c.end();
}

inspectChatLogs();
