const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'rvvctklkxjhypgmzcaym';
const ACCESS_TOKEN = 'sbp_0a3934a0661f55d57126cbdc9b738adb5a727630';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function runSQL(sql, label, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`=== ${label} ${attempt > 1 ? `(retry ${attempt})` : ''} ===`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    if (res.status === 429) { console.log('  Rate limited, waiting 30s...'); await delay(30000); continue; }
    if (!res.ok) { const t = await res.text(); console.error(`[ERROR] ${res.status}: ${t.substring(0, 400)}`); if (attempt < retries) { await delay(5000); continue; } return null; }
    const data = await res.json();
    if (data && data.length > 0 && data[0].error) { console.error(`[SQL ERROR] ${JSON.stringify(data[0].error).substring(0, 400)}`); return null; }
    console.log(`[OK]`);
    return data;
  }
  return null;
}

function esc(s) {
  if (s === null || s === undefined || s === '') return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function numOrNull(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 'NULL' : n;
}

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function buildAbbrevMap(localities) {
  const map = {}, used = {};
  localities.forEach(loc => {
    const clean = removeDiacritics(loc.trim());
    const words = clean.split(/\s+/);
    let abbrev = words.map(w => w.charAt(0).toUpperCase()).join('');
    let key = 'NP' + abbrev;
    if (used[key]) { abbrev = words.map((w, i) => i === words.length - 1 ? w.substring(0, 2).toUpperCase() : w.charAt(0).toUpperCase()).join(''); key = 'NP' + abbrev; }
    if (used[key]) { abbrev = words.map(w => w.substring(0, 2).toUpperCase()).join(''); key = 'NP' + abbrev; }
    if (used[key]) { let n = 2; while (used[key + n]) n++; key = key + n; }
    used[key] = loc; map[loc] = key;
  });
  return map;
}

async function run() {
  // Step 1: Add missing columns
  console.log('=== STEP 1: Adding missing columns ===\n');

  const newColumns = [
    'dia_danh TEXT',
    'so_hieu_lo TEXT',
    'kinh_do NUMERIC(12,8)',
    'vi_do NUMERIC(12,8)',
    'ten_tinh TEXT',
    'ten_huyen TEXT',
    'ten_xa TEXT',
    'ten_xa_moi TEXT'
  ];

  for (const col of newColumns) {
    const name = col.split(' ')[0];
    await runSQL(
      `ALTER TABLE lo_rung ADD COLUMN IF NOT EXISTS ${col};`,
      `Add column: ${name}`
    );
    await delay(1000);
  }

  // Verify columns
  const cols = await runSQL(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='lo_rung'
    ORDER BY ordinal_position;
  `, 'Verify lo_rung columns');
  if (cols) {
    console.log(`\nTotal columns in lo_rung: ${cols.length}`);
    const newNames = newColumns.map(c => c.split(' ')[0]);
    newNames.push('thoi_gian_khai_thac');
    cols.filter(c => newNames.includes(c.column_name)).forEach(c => console.log(`  ✓ ${c.column_name}`));
  }

  // Step 2: Read GeoJSON and build ID → data mapping
  console.log('\n=== STEP 2: Reading GeoJSON ===\n');
  const geoPath = path.resolve('G:\\My Drive\\GIS\\FSC\\Thai Nguyen\\Nam Phat\\NamPhat_all_6Feb2026.geojson');
  const geojson = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
  const features = geojson.features;
  console.log(`Total features: ${features.length}`);

  const localityMap = {};
  features.forEach(f => {
    const p = f.properties;
    const locality = (p['Địa danh'] || 'Không rõ').trim();
    const owner = (p['Tên chủ rừng'] || 'Không rõ').trim();
    if (!localityMap[locality]) localityMap[locality] = { owners: {} };
    if (!localityMap[locality].owners[owner]) localityMap[locality].owners[owner] = [];
    localityMap[locality].owners[owner].push(p);
  });

  const localities = Object.keys(localityMap).sort();
  const abbrevMap = buildAbbrevMap(localities);

  // Build update rows
  const updates = [];
  localities.forEach(loc => {
    const groupId = abbrevMap[loc];
    const ownerNames = Object.keys(localityMap[loc].owners).sort();
    ownerNames.forEach((ownerName, idx) => {
      const ownerId = `${groupId}.${String(idx + 1).padStart(4, '0')}`;
      localityMap[loc].owners[ownerName].forEach(p => {
        const plotCode = p['Mã số lô rừng'] || '';
        const loRungId = `${ownerId}.${plotCode}`;
        updates.push({
          id: loRungId,
          dia_danh: (p['Địa danh'] || '').trim() || null,
          so_hieu_lo: (p['Số hiệu lô'] || '').trim() || null,
          kinh_do: p['Kinh độ'] || null,
          vi_do: p['Vĩ độ'] || null,
          ten_tinh: (p['Tên tỉnh'] || '').trim() || null,
          ten_huyen: (p['Tên huyện'] || '').trim() || null,
          ten_xa: (p['Tên xã'] || '').trim() || null,
          ten_xa_moi: (p['Tên xã mới'] || '').trim() || null
        });
      });
    });
  });

  // Deduplicate
  const deduped = {};
  updates.forEach(r => { deduped[r.id] = r; });
  const uniqueRows = Object.values(deduped);
  console.log(`Rows to update: ${uniqueRows.length} (${updates.length - uniqueRows.length} duplicates removed)\n`);

  // Step 3: Update in batches
  console.log('=== STEP 3: Updating data ===\n');
  const BATCH = 200;
  let success = 0, fail = 0;

  for (let i = 0; i < uniqueRows.length; i += BATCH) {
    const batch = uniqueRows.slice(i, i + BATCH);

    // Build CASE statements for each field
    const fields = ['dia_danh', 'so_hieu_lo', 'ten_tinh', 'ten_huyen', 'ten_xa', 'ten_xa_moi'];
    const numFields = ['kinh_do', 'vi_do'];

    let setClauses = [];
    for (const field of fields) {
      const cases = batch.map(r => `WHEN ${esc(r.id)} THEN ${esc(r[field])}`).join(' ');
      setClauses.push(`${field} = CASE id ${cases} ELSE ${field} END`);
    }
    for (const field of numFields) {
      const cases = batch.map(r => `WHEN ${esc(r.id)} THEN ${numOrNull(r[field])}`).join(' ');
      setClauses.push(`${field} = CASE id ${cases} ELSE ${field} END`);
    }

    const ids = batch.map(r => esc(r.id)).join(',');

    const result = await runSQL(`
      UPDATE lo_rung SET ${setClauses.join(', ')}
      WHERE id IN (${ids});
    `, `Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(uniqueRows.length / BATCH)} (${i + 1}-${Math.min(i + BATCH, uniqueRows.length)})`);

    if (result !== null) success += batch.length;
    else fail += batch.length;

    await delay(2000);
  }

  console.log(`\n=== RESULT ===`);
  console.log(`  Updated: ${success}`);
  console.log(`  Failed: ${fail}`);

  // Verify
  await delay(2000);
  const verify = await runSQL(`
    SELECT
      count(*) FILTER (WHERE dia_danh IS NOT NULL) as dia_danh_cnt,
      count(*) FILTER (WHERE so_hieu_lo IS NOT NULL) as so_hieu_lo_cnt,
      count(*) FILTER (WHERE kinh_do IS NOT NULL) as kinh_do_cnt,
      count(*) FILTER (WHERE vi_do IS NOT NULL) as vi_do_cnt,
      count(*) FILTER (WHERE ten_tinh IS NOT NULL) as ten_tinh_cnt,
      count(*) FILTER (WHERE ten_huyen IS NOT NULL) as ten_huyen_cnt,
      count(*) FILTER (WHERE ten_xa IS NOT NULL) as ten_xa_cnt,
      count(*) FILTER (WHERE ten_xa_moi IS NOT NULL) as ten_xa_moi_cnt,
      count(*) FILTER (WHERE thoi_gian_khai_thac IS NOT NULL) as thoi_gian_kt_cnt,
      count(*) as total
    FROM lo_rung;
  `, 'Verify field counts');

  if (verify && verify[0]) {
    const v = verify[0];
    console.log('\n=== Field coverage ===');
    console.log(`  Total rows: ${v.total}`);
    console.log(`  dia_danh: ${v.dia_danh_cnt}`);
    console.log(`  so_hieu_lo: ${v.so_hieu_lo_cnt}`);
    console.log(`  kinh_do: ${v.kinh_do_cnt}`);
    console.log(`  vi_do: ${v.vi_do_cnt}`);
    console.log(`  ten_tinh: ${v.ten_tinh_cnt}`);
    console.log(`  ten_huyen: ${v.ten_huyen_cnt}`);
    console.log(`  ten_xa: ${v.ten_xa_cnt}`);
    console.log(`  ten_xa_moi: ${v.ten_xa_moi_cnt}`);
    console.log(`  thoi_gian_khai_thac: ${v.thoi_gian_kt_cnt}`);
  }

  console.log('\nDONE!');
}

run().catch(err => console.error('Fatal:', err));
