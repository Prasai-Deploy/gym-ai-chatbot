require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => client.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'")).then(res => {
  fs.writeFileSync('db_schema.json', JSON.stringify(res.rows, null, 2));
  client.end();
  console.log('Schema saved');
}).catch(e => { console.error(e); process.exit(1); });
