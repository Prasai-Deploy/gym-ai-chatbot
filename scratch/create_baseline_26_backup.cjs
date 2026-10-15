const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

function computeSha256(filePath) {
  const fileBuf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuf).digest('hex').toUpperCase();
}

async function createBaseline26Backup() {
  console.log('=== STRIVA V2: Fresh Baseline 26 Logical Backup ===');

  const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
  if (!fs.existsSync(pgDumpPath)) {
    throw new Error(`pg_dump not found at ${pgDumpPath}`);
  }

  const outDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const parsed = new URL(process.env.DATABASE_URL);
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const user = parsed.username || 'postgres';
  const password = decodeURIComponent(parsed.password);
  const database = parsed.pathname.slice(1) || 'postgres';

  const env = {
    ...process.env,
    PGPASSWORD: password
  };

  const schemaFile = path.join(outDir, 'striva_staging_baseline_26_schema.sql');
  const dataFile = path.join(outDir, 'striva_staging_baseline_26_data.sql');
  const authFile = path.join(outDir, 'striva_staging_baseline_26_auth.sql');

  console.log(`Target Host: ${host}:${port}`);
  console.log('1. Exporting public schema DDL...');
  execSync(`"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d ${database} -n public --schema-only --no-owner --no-privileges -f "${schemaFile}"`, { env, stdio: 'inherit' });
  console.log(`✓ Schema export created: ${fs.statSync(schemaFile).size} bytes`);

  console.log('2. Exporting public domain table data...');
  execSync(`"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d ${database} -n public --data-only --column-inserts --no-owner --no-privileges -f "${dataFile}"`, { env, stdio: 'inherit' });
  console.log(`✓ Data export created: ${fs.statSync(dataFile).size} bytes`);

  console.log('3. Exporting auth.users identities...');
  execSync(`"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d ${database} -t auth.users --data-only --column-inserts --no-owner --no-privileges -f "${authFile}"`, { env, stdio: 'inherit' });
  console.log(`✓ Auth export created: ${fs.statSync(authFile).size} bytes`);

  console.log('\n--- Backup File Summary & Checksums ---');
  const backups = [
    { name: 'striva_staging_baseline_26_schema.sql', path: schemaFile },
    { name: 'striva_staging_baseline_26_data.sql', path: dataFile },
    { name: 'striva_staging_baseline_26_auth.sql', path: authFile }
  ];

  for (const b of backups) {
    const stats = fs.statSync(b.path);
    const hash = computeSha256(b.path);
    console.log(`- ${b.name}: ${stats.size} bytes | SHA-256: ${hash}`);
  }
}

createBaseline26Backup().catch(err => {
  console.error('Failed to create baseline 26 backup:', err);
  process.exit(1);
});
