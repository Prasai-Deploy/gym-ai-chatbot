const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const { validateStagingDatabaseUrl } = require('./validate_guard_helper.cjs');

function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
}

async function verifyPreconditions() {
  console.log('=== STRIVA V2: Phase 12 & 12B Pre-Deployment Verification ===\n');

  // 1. Target Guard Check
  console.log('[1/4] Running Target Guard...');
  const targetInfo = validateStagingDatabaseUrl(process.env.DATABASE_URL);
  console.log(`✓ Target Guard PASSED: Host="${targetInfo.host}", Project="${targetInfo.projectRef}"`);

  // 2. Migration File Hashes
  console.log('\n[2/4] Verifying Migration Checksums...');
  const mig12Path = path.join('backend/supabase/migrations/phase_12_legacy_routine_hardening.sql');
  const mig12bPath = path.join('backend/supabase/migrations/phase_12b_consumer_analytics_persistence.sql');

  const EXPECTED_HASH_12 = 'A53F714C7ADBCEBD81BF08DAA8C16557F073CD9A1C990F0324C314F07B9396DE';
  const EXPECTED_HASH_12B = '008D7973C251F276A88FF04C26C76298A027B06E70FBAF09D2CF08AE40FE7703';

  const actualHash12 = computeSha256(mig12Path);
  const actualHash12b = computeSha256(mig12bPath);

  console.log(`Phase 12  Actual:   ${actualHash12}`);
  console.log(`Phase 12  Expected: ${EXPECTED_HASH_12}`);
  if (actualHash12 !== EXPECTED_HASH_12) throw new Error('Phase 12 checksum mismatch!');
  console.log('✓ Phase 12 checksum verified.');

  console.log(`Phase 12B Actual:   ${actualHash12b}`);
  console.log(`Phase 12B Expected: ${EXPECTED_HASH_12B}`);
  if (actualHash12b !== EXPECTED_HASH_12B) throw new Error('Phase 12B checksum mismatch!');
  console.log('✓ Phase 12B checksum verified.');

  // 3. Backup Files Check
  console.log('\n[3/4] Verifying Fresh Baseline 26 Logical Backups...');
  const backups = [
    {
      file: 'scratch/backups/striva_staging_baseline_26_schema.sql',
      expectedHash: 'DE41041EBF640E24752986E672D6819AC804D2979CAE4E951267F1C3A0E28A24'
    },
    {
      file: 'scratch/backups/striva_staging_baseline_26_data.sql',
      expectedHash: '48047912C9C61DAEE163960B4A8D877574DA5DAC2FAF0A733892A4F27DF08347'
    },
    {
      file: 'scratch/backups/striva_staging_baseline_26_auth.sql',
      expectedHash: '405B34EE5FACE3A113958417B05F0BDFAC1F0A0812E94CA110F55DA21C7E91DF'
    }
  ];

  for (const b of backups) {
    if (!fs.existsSync(b.file)) throw new Error(`Backup file missing: ${b.file}`);
    const actualHash = computeSha256(b.file);
    if (actualHash !== b.expectedHash) {
      throw new Error(`Backup hash mismatch for ${b.file}: got ${actualHash}, expected ${b.expectedHash}`);
    }
    console.log(`✓ Backup verified: ${b.file} (${actualHash})`);
  }

  // 4. Live Staging Database State Check
  console.log('\n[4/4] Verifying Live Staging Migration Baseline...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    const countRes = await client.query('SELECT count(*) as total FROM _migrations');
    const total = parseInt(countRes.rows[0].total, 10);
    console.log(`Live _migrations count: ${total}`);
    if (total !== 26) {
      throw new Error(`Expected baseline 26 migrations, but live staging has ${total}`);
    }

    const check12 = await client.query("SELECT * FROM _migrations WHERE name LIKE '%phase_12%'");
    if (check12.rows.length > 0) {
      throw new Error(`Phase 12 migrations already recorded: ${JSON.stringify(check12.rows)}`);
    }
    console.log('✓ Confirmed baseline is exactly 26 with zero Phase 12 records.');

  } finally {
    await client.end();
  }

  console.log('\n================================================================');
  console.log('ALL PRECONDITIONS STRICTLY VERIFIED! READY FOR PHASE 12.');
  console.log('================================================================\n');
}

verifyPreconditions().catch(err => {
  console.error('\n❌ PRECONDITION CHECK FAILED:', err.message);
  process.exit(1);
});
