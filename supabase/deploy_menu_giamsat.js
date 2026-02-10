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
    console.error(`[ERROR] HTTP ${res.status}: ${text.substring(0, 300)}`);
    return null;
  }

  const data = await res.json();
  if (data && data.length > 0 && data[0].error) {
    console.error(`[ERROR] ${JSON.stringify(data[0].error).substring(0, 300)}`);
    return null;
  }

  console.log(`[OK]\n`);
  return data;
}

async function run() {
  console.log('Deploying GIÁM SÁT menu group...\n');

  // 1. Remove old monitoring items from QUẢN LÝ RỪNG BỀN VỮNG
  await runSQL(`
    DELETE FROM menu WHERE view_name IN ('ThucHien_GiamSat', 'KH_GiamSat_Nhom', 'HD_giamsat', 'GiamSat_LoRung');
  `, 'Remove old monitoring menu items from QLRBV');

  // 2. Insert new GIÁM SÁT group menu items
  await runSQL(`
    INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
    ('GIÁM SÁT', 'Kế hoạch giám sát',     'KH_GiamSat_Nhom', '1','1','1','1', NULL),
    ('GIÁM SÁT', 'Giám sát nhóm',          'GS_Nhom',         '1','1','1','1', NULL),
    ('GIÁM SÁT', 'Giám sát trồng rừng',    'GS_TrongRung',    '1','1','1','1', NULL),
    ('GIÁM SÁT', 'Giám sát khai thác',     'GS_KhaiThac',     '1','1','1','1', NULL),
    ('GIÁM SÁT', 'Giám sát môi trường',    'GS_MoiTruong',    '1','1','1','1', NULL)
    ON CONFLICT DO NOTHING;
  `, 'Insert GIÁM SÁT group menu items');

  // 3. Verify all menu items
  const result = await runSQL(`
    SELECT nhom, module, view_name FROM menu ORDER BY id;
  `, 'Verify all menu items');

  if (result) {
    console.log(`Total: ${result.length} menu items\n`);
    let currentGroup = '';
    result.forEach(r => {
      if (r.nhom !== currentGroup) {
        currentGroup = r.nhom;
        console.log(`\n[${currentGroup}]`);
      }
      console.log(`  - ${r.module} (${r.view_name})`);
    });
  }

  console.log('\nDone!');
}

run().catch(err => console.error('Fatal:', err));
