const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';

async function runSQL(sql, label) {
  console.log(`=== Running ${label} ===`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ERROR] ${label}: HTTP ${res.status} - ${text.substring(0, 500)}\n`);
    return false;
  }

  const data = await res.json();
  if (data && data.length > 0 && data[0].error) {
    console.error(`[ERROR] ${label}: ${JSON.stringify(data[0].error).substring(0, 500)}\n`);
    return false;
  }

  console.log(`[OK] ${label}\n`);
  return true;
}

async function run() {
  console.log('Deploying Monitoring Module...\n');

  // Step 1: Run schema_monitoring.sql
  const schemaPath = path.join(__dirname, 'schema_monitoring.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const ok = await runSQL(sql, 'schema_monitoring.sql');
  if (!ok) {
    console.log('Schema deployment failed.');
    return;
  }

  // Step 2: Verify tables
  console.log('=== Verification ===');
  const verifyRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%giam_sat%' OR table_name LIKE '%bang_hoi_giam%' OR table_name LIKE '%kh_giam%' ORDER BY table_name"
    })
  });

  if (verifyRes.ok) {
    const tables = await verifyRes.json();
    console.log(`Monitoring tables found: ${tables.length}`);
    tables.forEach(r => console.log('  - ' + r.table_name));
  }

  // Step 3: Verify menu
  const menuRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "SELECT nhom, module, view_name FROM menu WHERE view_name = 'GiamSat_LoRung'"
    })
  });

  if (menuRes.ok) {
    const menus = await menuRes.json();
    console.log(`\nMonitoring menu items: ${menus.length}`);
    menus.forEach(r => console.log(`  - ${r.nhom} > ${r.module} (${r.view_name})`));
  }

  console.log('\nDone!');
}

run().catch(err => console.error('Fatal:', err));
