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
  // Step 1: Add thoi_gian_khai_thac column (if not exists)
  await runSQL(`
    ALTER TABLE lo_rung ADD COLUMN IF NOT EXISTS thoi_gian_khai_thac TEXT;
  `, 'Add thoi_gian_khai_thac column');

  await delay(2000);

  // Step 2: Read GeoJSON and build ID mapping
  const geoPath = path.resolve('G:\\My Drive\\GIS\\FSC\\Thai Nguyen\\Nam Phat\\NamPhat_all_6Feb2026.geojson');
  console.log('\nReading GeoJSON:', geoPath);
  const geojson = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
  const features = geojson.features;
  console.log(`Total features: ${features.length}`);

  // Build same ID mapping as import scripts
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

  // Build id_lo_rung → harvest time mapping
  const updates = [];
  localities.forEach(loc => {
    const groupId = abbrevMap[loc];
    const ownerNames = Object.keys(localityMap[loc].owners).sort();
    ownerNames.forEach((ownerName, idx) => {
      const ownerId = `${groupId}.${String(idx + 1).padStart(4, '0')}`;
      localityMap[loc].owners[ownerName].forEach(p => {
        const plotCode = p['Mã số lô rừng'] || '';
        const loRungId = `${ownerId}.${plotCode}`;
        const harvestTime = p['Thời gian Khai thác'];
        if (harvestTime) {
          updates.push({ id: loRungId, harvestTime: String(harvestTime).trim() });
        }
      });
    });
  });

  console.log(`\nPlots with harvest time: ${updates.length}`);

  // Show distribution
  const byTime = {};
  updates.forEach(u => {
    if (!byTime[u.harvestTime]) byTime[u.harvestTime] = 0;
    byTime[u.harvestTime]++;
  });
  Object.keys(byTime).sort().forEach(k => console.log(`  ${k}: ${byTime[k]} plots`));

  // Step 3: Update in batches
  const BATCH = 100;
  let success = 0, fail = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const cases = batch.map(u => `WHEN ${esc(u.id)} THEN ${esc(u.harvestTime)}`).join(' ');
    const ids = batch.map(u => esc(u.id)).join(',');

    const result = await runSQL(`
      UPDATE lo_rung SET thoi_gian_khai_thac = CASE id ${cases} END
      WHERE id IN (${ids});
    `, `Update harvest time ${i + 1}-${Math.min(i + BATCH, updates.length)} / ${updates.length}`);

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
    SELECT thoi_gian_khai_thac, count(*) as cnt
    FROM lo_rung
    WHERE thoi_gian_khai_thac IS NOT NULL
    GROUP BY thoi_gian_khai_thac
    ORDER BY thoi_gian_khai_thac;
  `, 'Verify harvest data');

  if (verify) {
    console.log('\n=== Harvest time in DB ===');
    verify.forEach(r => console.log(`  ${r.thoi_gian_khai_thac}: ${r.cnt} plots`));
  }

  console.log('\nDONE!');
}

run().catch(err => console.error('Fatal:', err));
