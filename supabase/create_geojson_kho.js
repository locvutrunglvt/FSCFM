const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';

async function runSQL(sql, label) {
  console.log(`=== ${label} ===`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    console.error(`[ERROR] HTTP ${res.status}: ${await res.text()}`);
    return false;
  }
  const data = await res.json();
  if (data?.[0]?.error) {
    console.error(`[ERROR] ${JSON.stringify(data[0].error)}`);
    return false;
  }
  console.log('[OK]');
  return true;
}

async function run() {
  await runSQL(`
    CREATE TABLE IF NOT EXISTS geojson_kho (
      id SERIAL PRIMARY KEY,
      ten_lop TEXT NOT NULL,
      geojson_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      ghi_chu TEXT,
      version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_geojson_kho_name ON geojson_kho(ten_lop);
  `, 'Create geojson_kho table');

  await runSQL(`
    ALTER TABLE geojson_kho ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "geojson_kho_all" ON geojson_kho FOR ALL USING (true) WITH CHECK (true);
  `, 'Set RLS policy');

  // Verify
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='geojson_kho' ORDER BY ordinal_position" })
  });
  const cols = await res.json();
  console.log('\nTable columns:');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
}

run().catch(err => console.error('Fatal:', err));
