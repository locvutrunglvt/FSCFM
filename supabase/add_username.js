const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSQL(sql, label) {
  console.log(`=== ${label} ===`);
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    if (res.status === 429) { await sleep(5000); continue; }
    if (!res.ok) { console.error(`[ERR] ${label}: ${(await res.text()).substring(0, 300)}`); return null; }
    const data = await res.json();
    if (data?.[0]?.error) { console.error(`[ERR] ${label}: ${JSON.stringify(data[0].error).substring(0, 300)}`); return null; }
    console.log(`[OK] ${label}`);
    return data;
  }
  return null;
}

async function run() {
  // 1. Add username column
  await runSQL(`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
  `, 'Add username column');
  await sleep(2000);

  // 2. Update trigger to also save username from metadata
  await runSQL(`
    CREATE OR REPLACE FUNCTION handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO profiles (id, email, ho_va_ten, username, trang_thai)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'ho_va_ten', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', NULL),
        'Act'
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `, 'Update handle_new_user trigger');
  await sleep(2000);

  // 3. Verify
  const cols = await runSQL(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name='profiles' ORDER BY ordinal_position;
  `, 'Verify columns');
  if (cols) {
    console.log('\nProfiles columns:');
    cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  }

  console.log('\nDone!');
}

run().catch(err => console.error('Fatal:', err));
