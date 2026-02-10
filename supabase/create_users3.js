const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';
const SUPABASE_URL = 'https://rvvctklkxjhypgmzcaym.supabase.co';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const USERS = [
  { username: 'ledinhduy', email: 'duc.lethien@cleverforestry.com', password: '111111', name: 'Le Dinh Duy' },
  { username: 'lethienduc', email: 'duy.ledinh@cleverforestry.com', password: '111111', name: 'Le Thien Duc' },
  { username: 'locvutrung', email: 'trung.locvu@cleverforestry.com', password: '111111', name: 'Loc Vu Trung' }
];

async function runSQL(sql, label) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    if (res.status === 429) { await sleep(5000); continue; }
    if (!res.ok) { console.error(`[ERR] ${label}: ${(await res.text()).substring(0,300)}`); return null; }
    const data = await res.json();
    if (data?.[0]?.error) { console.error(`[ERR] ${label}: ${JSON.stringify(data[0].error).substring(0,300)}`); return null; }
    console.log(`[OK] ${label}`);
    return data;
  }
  return null;
}

async function getServiceRoleKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
  });
  if (!res.ok) return null;
  const keys = await res.json();
  return keys.find(k => k.name === 'service_role')?.api_key;
}

async function run() {
  // Step 1: Disable the trigger temporarily
  console.log('Step 1: Disable trigger on auth.users');
  await runSQL('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;', 'Drop trigger');
  await sleep(2000);

  // Step 2: Get service role key
  const serviceKey = await getServiceRoleKey();
  if (!serviceKey) { console.error('Cannot get service_role key'); return; }
  console.log('Got service_role key.\n');

  // Step 3: Create each user
  for (const u of USERS) {
    console.log(`\n--- Creating ${u.username} (${u.email}) ---`);

    // Check if auth user exists
    const existing = await runSQL(`SELECT id FROM auth.users WHERE email='${u.email}';`, `Check ${u.email}`);
    await sleep(1000);

    let userId;
    if (existing && existing.length > 0) {
      userId = existing[0].id;
      console.log(`  Already exists in auth.users: ${userId}`);
      // Update password via admin API
      const pwRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: u.password, email_confirm: true })
      });
      console.log(`  Password update: ${pwRes.ok ? 'OK' : (await pwRes.text()).substring(0,200)}`);
    } else {
      // Create via admin API (trigger is disabled)
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { ho_va_ten: u.name, username: u.username }
        })
      });
      if (!createRes.ok) {
        console.error(`  [ERR] Create: ${(await createRes.text()).substring(0,200)}`);
        continue;
      }
      const data = await createRes.json();
      userId = data.id;
      console.log(`  Created auth user: ${userId}`);
    }

    await sleep(1500);

    if (!userId) continue;

    // Check if profile exists
    const profCheck = await runSQL(`SELECT id FROM profiles WHERE id='${userId}';`, `Check profile ${u.username}`);
    await sleep(1000);

    if (profCheck && profCheck.length > 0) {
      // Update existing profile
      await runSQL(`UPDATE profiles SET username='${u.username}', ho_va_ten='${u.name}', trang_thai='Act', chuc_vu='Admin', email='${u.email}' WHERE id='${userId}';`, `Update profile ${u.username}`);
    } else {
      // Insert new profile
      await runSQL(`INSERT INTO profiles (id, email, ho_va_ten, username, trang_thai, chuc_vu) VALUES ('${userId}', '${u.email}', '${u.name}', '${u.username}', 'Act', 'Admin');`, `Insert profile ${u.username}`);
    }

    await sleep(1500);
  }

  // Step 4: Re-enable trigger
  console.log('\n\nStep 4: Re-enable trigger');
  await runSQL(`
    CREATE OR REPLACE FUNCTION handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO profiles (id, email, ho_va_ten, username, trang_thai)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'ho_va_ten', ''),
        NULLIF(COALESCE(NEW.raw_user_meta_data->>'username', ''), ''),
        'Act'
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        ho_va_ten = COALESCE(NULLIF(EXCLUDED.ho_va_ten, ''), profiles.ho_va_ten);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  `, 'Recreate trigger');
  await sleep(1000);

  // Step 5: Verify
  console.log('\n=== Final Verification ===');
  const profiles = await runSQL("SELECT id_staff, ho_va_ten, email, username, trang_thai, chuc_vu FROM profiles ORDER BY created_at;", 'List all profiles');
  if (profiles) {
    console.log(`\n${profiles.length} profiles:`);
    profiles.forEach(r => console.log(`  ${r.id_staff||'-'} | ${r.ho_va_ten||'-'} | ${r.email||'-'} | @${r.username||'-'} | ${r.trang_thai} | ${r.chuc_vu||'-'}`));
  }

  console.log('\nDone!');
}

run().catch(err => console.error('Fatal:', err));
