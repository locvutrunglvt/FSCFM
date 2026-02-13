const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSQL(sql, label) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    if (res.status === 429) { console.log(`[RATE] ${label} - retrying...`); await sleep(5000); continue; }
    if (!res.ok) { console.error(`[ERR] ${label}: ${(await res.text()).substring(0, 300)}`); return null; }
    const data = await res.json();
    if (data?.[0]?.error) { console.error(`[ERR] ${label}: ${JSON.stringify(data[0].error).substring(0, 300)}`); return null; }
    console.log(`[OK] ${label}`);
    return data;
  }
  return null;
}

async function run() {
  console.log('=== Enhancements: ALTER tables + Reference tables ===\n');

  // ==========================================
  // STEP 1: ALTER existing tables - add file upload columns
  // ==========================================
  console.log('--- Step 1: ALTER lop_tap_huan ---');
  await runSQL(`
    ALTER TABLE lop_tap_huan
      ADD COLUMN IF NOT EXISTS tai_lieu_url TEXT,
      ADD COLUMN IF NOT EXISTS hinh_anh_url TEXT,
      ADD COLUMN IF NOT EXISTS bao_cao_url TEXT;
  `, 'ALTER lop_tap_huan + file uploads');
  await sleep(1500);

  console.log('--- Step 2: ALTER khieu_nai ---');
  await runSQL(`
    ALTER TABLE khieu_nai
      ADD COLUMN IF NOT EXISTS tai_lieu_url TEXT,
      ADD COLUMN IF NOT EXISTS hinh_anh_url TEXT;
  `, 'ALTER khieu_nai + file uploads');
  await sleep(1500);

  console.log('--- Step 3: ALTER tai_san ---');
  await runSQL(`
    ALTER TABLE tai_san
      ADD COLUMN IF NOT EXISTS tai_lieu_url TEXT,
      ADD COLUMN IF NOT EXISTS hinh_anh_url TEXT;
  `, 'ALTER tai_san + file uploads');
  await sleep(1500);

  console.log('--- Step 4: ALTER dung_cu_lao_dong ---');
  await runSQL(`
    ALTER TABLE dung_cu_lao_dong
      ADD COLUMN IF NOT EXISTS tai_lieu_url TEXT,
      ADD COLUMN IF NOT EXISTS hinh_anh_url TEXT;
  `, 'ALTER dung_cu_lao_dong + file uploads');
  await sleep(1500);

  console.log('--- Step 5: ALTER chu_rung + da_tap_huan ---');
  await runSQL(`
    ALTER TABLE chu_rung
      ADD COLUMN IF NOT EXISTS da_tap_huan BOOLEAN DEFAULT false;
  `, 'ALTER chu_rung + da_tap_huan');
  await sleep(1500);

  // ==========================================
  // STEP 2: CREATE 4 reference tables
  // ==========================================
  console.log('\n--- Step 6: CREATE danh_muc_thuoc_bvtv ---');
  await runSQL(`
    CREATE TABLE IF NOT EXISTS danh_muc_thuoc_bvtv (
      id TEXT PRIMARY KEY,
      ten_thuong_mai TEXT,
      hoat_chat TEXT,
      nhom_thuoc TEXT,
      doi_tuong_phong_tru TEXT,
      lieu_luong TEXT,
      cach_su_dung TEXT,
      thoi_gian_cach_ly TEXT,
      doc_tinh TEXT,
      ghi_chu TEXT,
      trang_thai TEXT DEFAULT 'Act',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE danh_muc_thuoc_bvtv');
  await sleep(2000);

  console.log('--- Step 7: CREATE danh_muc_cay_trong ---');
  await runSQL(`
    CREATE TABLE IF NOT EXISTS danh_muc_cay_trong (
      id TEXT PRIMARY KEY,
      ten_tieng_viet TEXT,
      ten_khoa_hoc TEXT,
      ho_thuc_vat TEXT,
      nhom_cay TEXT,
      vung_phan_bo TEXT,
      dac_diem TEXT,
      cong_dung TEXT,
      ghi_chu TEXT,
      trang_thai TEXT DEFAULT 'Act',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE danh_muc_cay_trong');
  await sleep(2000);

  console.log('--- Step 8: CREATE danh_muc_phan_bon ---');
  await runSQL(`
    CREATE TABLE IF NOT EXISTS danh_muc_phan_bon (
      id TEXT PRIMARY KEY,
      ten_phan_bon TEXT,
      loai_phan TEXT,
      thanh_phan TEXT,
      ham_luong TEXT,
      cach_su_dung TEXT,
      lieu_luong TEXT,
      nha_san_xuat TEXT,
      ghi_chu TEXT,
      trang_thai TEXT DEFAULT 'Act',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE danh_muc_phan_bon');
  await sleep(2000);

  console.log('--- Step 9: CREATE nguon_goc_cay_giong ---');
  await runSQL(`
    CREATE TABLE IF NOT EXISTS nguon_goc_cay_giong (
      id TEXT PRIMARY KEY,
      ten_giong TEXT,
      loai_cay TEXT,
      xuat_xu TEXT,
      nha_cung_cap TEXT,
      dia_chi_ncc TEXT,
      giay_chung_nhan TEXT,
      nam_cung_cap INT,
      chat_luong TEXT,
      ghi_chu TEXT,
      trang_thai TEXT DEFAULT 'Act',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE nguon_goc_cay_giong');
  await sleep(2000);

  // ==========================================
  // STEP 3: RLS for new tables
  // ==========================================
  console.log('\n--- Step 10: Enable RLS ---');
  await runSQL(`
    ALTER TABLE danh_muc_thuoc_bvtv ENABLE ROW LEVEL SECURITY;
    ALTER TABLE danh_muc_cay_trong ENABLE ROW LEVEL SECURITY;
    ALTER TABLE danh_muc_phan_bon ENABLE ROW LEVEL SECURITY;
    ALTER TABLE nguon_goc_cay_giong ENABLE ROW LEVEL SECURITY;
  `, 'Enable RLS for reference tables');
  await sleep(1500);

  await runSQL(`
    CREATE POLICY "Allow all for authenticated" ON danh_muc_thuoc_bvtv
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `, 'RLS danh_muc_thuoc_bvtv');
  await sleep(1000);

  await runSQL(`
    CREATE POLICY "Allow all for authenticated" ON danh_muc_cay_trong
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `, 'RLS danh_muc_cay_trong');
  await sleep(1000);

  await runSQL(`
    CREATE POLICY "Allow all for authenticated" ON danh_muc_phan_bon
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `, 'RLS danh_muc_phan_bon');
  await sleep(1000);

  await runSQL(`
    CREATE POLICY "Allow all for authenticated" ON nguon_goc_cay_giong
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `, 'RLS nguon_goc_cay_giong');
  await sleep(1000);

  // ==========================================
  // STEP 4: Menu items for reference tables
  // ==========================================
  console.log('\n--- Step 11: Insert menu items ---');

  // First check existing menu items to avoid duplicates
  const existingMenus = await runSQL(`
    SELECT view_name FROM menu WHERE view_name IN ('TL_ThuocBVTV', 'TL_CayTrong', 'TL_PhanBon', 'TL_NguonGocGiong');
  `, 'Check existing menu items');

  const existingViews = (existingMenus || []).map(m => m.view_name);

  const menuItems = [
    { module: 'Danh mục thuốc BVTV', view: 'TL_ThuocBVTV' },
    { module: 'Danh mục cây trồng', view: 'TL_CayTrong' },
    { module: 'Danh mục phân bón', view: 'TL_PhanBon' },
    { module: 'Nguồn gốc cây giống', view: 'TL_NguonGocGiong' }
  ];

  for (const item of menuItems) {
    if (!existingViews.includes(item.view)) {
      await runSQL(`
        INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
          ('QUẢN LÝ RỪNG BỀN VỮNG', '${item.module}', '${item.view}', '1', '1', '1', '1', '');
      `, `Insert menu: ${item.module}`);
      await sleep(1000);
    } else {
      console.log(`[SKIP] Menu ${item.view} already exists`);
    }
  }

  // ==========================================
  // VERIFICATION
  // ==========================================
  console.log('\n=== Verification ===');

  const tables = await runSQL(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('danh_muc_thuoc_bvtv','danh_muc_cay_trong','danh_muc_phan_bon','nguon_goc_cay_giong')
    ORDER BY table_name;
  `, 'Check new tables');
  if (tables) {
    console.log('New tables:', tables.map(t => t.table_name).join(', '));
  }

  const cols = await runSQL(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public'
      AND ((table_name='lop_tap_huan' AND column_name IN ('tai_lieu_url','hinh_anh_url','bao_cao_url'))
        OR (table_name='khieu_nai' AND column_name IN ('tai_lieu_url','hinh_anh_url'))
        OR (table_name='tai_san' AND column_name IN ('tai_lieu_url','hinh_anh_url'))
        OR (table_name='dung_cu_lao_dong' AND column_name IN ('tai_lieu_url','hinh_anh_url'))
        OR (table_name='chu_rung' AND column_name='da_tap_huan'))
    ORDER BY table_name, column_name;
  `, 'Check new columns');
  if (cols) {
    console.log('New columns:');
    cols.forEach(c => console.log(`  ${c.table_name}.${c.column_name}`));
  }

  const menus = await runSQL(`
    SELECT module, view_name FROM menu WHERE view_name IN ('TL_ThuocBVTV','TL_CayTrong','TL_PhanBon','TL_NguonGocGiong') ORDER BY module;
  `, 'Check menu items');
  if (menus) {
    console.log('Menu items:');
    menus.forEach(m => console.log(`  - ${m.module} (${m.view_name})`));
  }

  console.log('\nDone! All enhancements deployed.');
}

run().catch(err => console.error('Fatal:', err));
