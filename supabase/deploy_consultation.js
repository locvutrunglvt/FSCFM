const fs = require('fs');
const path = require('path');

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
    const text = await res.text();
    console.error(`[ERROR] HTTP ${res.status}: ${text.substring(0, 500)}`);
    return null;
  }

  const data = await res.json();
  if (data && data.length > 0 && data[0].error) {
    console.error(`[ERROR] ${JSON.stringify(data[0].error).substring(0, 500)}`);
    return null;
  }

  console.log(`[OK]\n`);
  return data;
}

async function run() {
  console.log('Deploying Consultation Module...\n');

  // Step 1: Run schema
  const schemaPath = path.join(__dirname, 'schema_consultation.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const ok = await runSQL(sql, 'schema_consultation.sql');
  if (!ok && ok !== null) {
    console.log('Schema deployment may have issues, continuing...');
  }

  // Step 2: Update menu - replace Tham_van with 2 sub-items
  await runSQL(`
    DELETE FROM menu WHERE view_name = 'Tham_van';
  `, 'Remove old Tham_van menu');

  await runSQL(`
    INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
    ('QUẢN LÝ RỪNG BỀN VỮNG', 'Danh sách bên liên quan', 'DS_BenLienQuan', '1','1','1','1', NULL),
    ('QUẢN LÝ RỪNG BỀN VỮNG', 'Thực hiện tham vấn', 'ThucHien_ThamVan', '1','1','1','1', NULL)
    ON CONFLICT DO NOTHING;
  `, 'Insert consultation menu items');

  // Step 3: Add handbook menu item
  await runSQL(`
    INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
    ('TÀI LIỆU THAM KHẢO', 'Sổ tay quản lý rừng bền vững', 'SoTay_QLRBV', '1','0','0','0', NULL)
    ON CONFLICT DO NOTHING;
  `, 'Insert handbook menu item');

  // Step 4: Verify tables
  const tables = await runSQL(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
    AND table_name IN ('ben_lien_quan', 'dot_tham_van', 'phan_hoi_tham_van')
    ORDER BY table_name;
  `, 'Verify consultation tables');

  if (tables) {
    console.log(`Consultation tables found: ${tables.length}`);
    tables.forEach(r => console.log('  - ' + r.table_name));
  }

  // Step 5: Verify menu
  const menu = await runSQL(`
    SELECT nhom, module, view_name FROM menu
    WHERE view_name IN ('DS_BenLienQuan', 'ThucHien_ThamVan', 'SoTay_QLRBV')
    ORDER BY id;
  `, 'Verify new menu items');

  if (menu) {
    console.log(`New menu items: ${menu.length}`);
    menu.forEach(r => console.log(`  - ${r.nhom} > ${r.module} (${r.view_name})`));
  }

  console.log('\nDone!');
}

run().catch(err => console.error('Fatal:', err));
