const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.log('backend/.env does not exist!');
  process.exit(1);
}

const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
console.log('Keys in backend/.env:');
for (const [k, v] of Object.entries(parsed)) {
  const isSet = v && v.trim().length > 0;
  const preview = isSet ? (v.length > 8 ? `${v.substring(0, 4)}...${v.substring(v.length - 4)} (${v.length} chars)` : '[short value]') : '[EMPTY]';
  console.log(`  ${k}: ${isSet ? 'SET' : 'EMPTY'} - ${preview}`);
}
