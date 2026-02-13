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
  console.log('=== EUDR Module Setup ===\n');

  // Step 1: Create tables
  console.log('Step 1: Creating dot_dg_eudr table...');
  await runSQL(`
    CREATE TABLE IF NOT EXISTS dot_dg_eudr (
      id TEXT PRIMARY KEY,
      id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
      id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
      id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
      ngay_danh_gia DATE,
      nguoi_danh_gia TEXT,
      diem_so INT DEFAULT 0,
      trang_thai TEXT DEFAULT 'Mới',
      ghi_chu TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'Create dot_dg_eudr');
  await sleep(2000);

  console.log('Step 2: Creating bang_hoi_eudr table...');
  await runSQL(`
    CREATE TABLE IF NOT EXISTS bang_hoi_eudr (
      id TEXT PRIMARY KEY,
      id_dg TEXT REFERENCES dot_dg_eudr(id) ON DELETE CASCADE,
      answers JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'Create bang_hoi_eudr');
  await sleep(2000);

  // Step 3: Trigger
  console.log('Step 3: Creating update trigger...');
  await runSQL(`
    CREATE TRIGGER trg_dot_dg_eudr_updated
      BEFORE UPDATE ON dot_dg_eudr
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `, 'Create trigger');
  await sleep(1000);

  // Step 4: Indexes
  console.log('Step 4: Creating indexes...');
  await runSQL(`
    CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_lorung ON dot_dg_eudr(id_lo_rung);
    CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_nhom ON dot_dg_eudr(id_nhom);
    CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_churung ON dot_dg_eudr(id_chu_rung);
    CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_ngay ON dot_dg_eudr(ngay_danh_gia);
    CREATE INDEX IF NOT EXISTS idx_bang_hoi_eudr_dg ON bang_hoi_eudr(id_dg);
  `, 'Create indexes');
  await sleep(1000);

  // Step 5: RLS
  console.log('Step 5: Enabling RLS...');
  await runSQL(`
    ALTER TABLE dot_dg_eudr ENABLE ROW LEVEL SECURITY;
    ALTER TABLE bang_hoi_eudr ENABLE ROW LEVEL SECURITY;
  `, 'Enable RLS');
  await sleep(1000);

  await runSQL(`
    CREATE POLICY "Allow all for authenticated" ON dot_dg_eudr
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `, 'RLS policy dot_dg_eudr');
  await sleep(1000);

  await runSQL(`
    CREATE POLICY "Allow all for authenticated" ON bang_hoi_eudr
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `, 'RLS policy bang_hoi_eudr');
  await sleep(1000);

  // Step 6: Menu items
  console.log('Step 6: Inserting menu items...');
  await runSQL(`
    INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
      ('QUẢN LÝ RỪNG BỀN VỮNG', 'Tài liệu tham khảo EUDR', 'EUDR_TaiLieu', '1', '0', '0', '0', ''),
      ('QUẢN LÝ RỪNG BỀN VỮNG', 'Đánh giá tuân thủ EUDR', 'EUDR_DanhGia', '1', '1', '1', '1', ''),
      ('QUẢN LÝ RỪNG BỀN VỮNG', 'Báo cáo tuân thủ EUDR', 'EUDR_BaoCao', '1', '0', '0', '0', '')
    ON CONFLICT DO NOTHING;
  `, 'Insert menu items');
  await sleep(1000);

  // Step 7: Verify
  console.log('\n=== Verification ===');
  const tables = await runSQL(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('dot_dg_eudr','bang_hoi_eudr')
    ORDER BY table_name;
  `, 'Check tables');
  if (tables) {
    console.log('Tables created:', tables.map(t => t.table_name).join(', '));
  }

  const menus = await runSQL(`
    SELECT module, view_name FROM menu WHERE view_name LIKE 'EUDR%' ORDER BY module;
  `, 'Check menu items');
  if (menus) {
    console.log('Menu items:');
    menus.forEach(m => console.log(`  - ${m.module} (${m.view_name})`));
  }

  console.log('\nDone! EUDR module tables and menu items are ready.');
}

run().catch(err => console.error('Fatal:', err));
