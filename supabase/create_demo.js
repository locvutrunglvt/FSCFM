const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';
const SUPABASE_URL = 'https://rvvctklkxjhypgmzcaym.supabase.co';

async function runSQL(sql, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  const data = await res.json();
  if (data?.[0]?.error) { console.error(`[ERR] ${label}:`, data[0].error); return null; }
  console.log(`[OK] ${label}`);
  return data;
}

async function run() {
  console.log('=== Creating Demo Account ===\n');

  // Step 1: Get service_role key
  const keysRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
  });
  const keys = await keysRes.json();
  const serviceKey = keys.find(k => k.name === 'service_role').api_key;
  console.log('[OK] Got service_role key');

  // Step 2: Check if demo user already exists
  const existing = await runSQL("SELECT id, email, username FROM profiles WHERE username = 'lvt1'", 'Check existing');

  let userId;

  if (existing && existing.length > 0) {
    // User exists - update password
    userId = existing[0].id;
    console.log(`[INFO] User exists: ${userId}, updating password...`);

    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: 'abc123456', email_confirm: true })
    });
    const updateData = await updateRes.json();
    if (updateData.error) {
      console.error('[ERR] Update password:', updateData);
      return;
    }
    console.log('[OK] Password updated');
  } else {
    // Create new user
    const email = 'lvt1.demo@fscfm.vn';
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: 'abc123456',
        email_confirm: true,
        user_metadata: { ho_va_ten: 'Demo User' }
      })
    });

    const user = await createRes.json();
    if (user.error || !user.id) {
      console.error('[ERR] Create user:', user);
      return;
    }
    userId = user.id;
    console.log(`[OK] User created: ${userId}`);

    // Wait for trigger to create profile
    await new Promise(r => setTimeout(r, 2000));
  }

  // Step 3: Update profile with username and role
  await runSQL(`
    UPDATE profiles SET
      ho_va_ten = 'Demo User',
      username = 'lvt1',
      chuc_vu = 'Admin',
      trang_thai = 'Act'
    WHERE id = '${userId}';
  `, 'Update profile');

  // Step 4: Verify
  const result = await runSQL(`
    SELECT id, id_staff, ho_va_ten, email, username, chuc_vu, trang_thai
    FROM profiles WHERE id = '${userId}';
  `, 'Verify');

  if (result && result.length > 0) {
    console.log('\n=== Demo Account Ready ===');
    console.log('Username: LVT1 (case-insensitive)');
    console.log('Password: abc123456');
    console.log('Email:   ', result[0].email);
    console.log('Name:    ', result[0].ho_va_ten);
    console.log('Role:    ', result[0].chuc_vu);
    console.log('Status:  ', result[0].trang_thai);
    console.log('Staff ID:', result[0].id_staff);
  }
}

run().catch(err => console.error('Fatal:', err));
