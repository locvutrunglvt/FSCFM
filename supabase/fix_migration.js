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
    if (!res.ok) { const t = await res.text(); console.error(`[ERROR] ${res.status}: ${t.substring(0, 500)}`); if (attempt < retries) { await delay(5000); continue; } return null; }
    const data = await res.json();
    if (data && data.length > 0 && data[0].error) { console.error(`[SQL ERROR] ${JSON.stringify(data[0].error).substring(0, 500)}`); return null; }
    console.log(`[OK]`);
    return data;
  }
  return null;
}

function esc(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

async function run() {
  // Check current state of the 2 failed groups
  console.log('=== Checking current state ===\n');
  const check = await runSQL(`SELECT id, ma_nhom, ten_nhom FROM nhom_ccr WHERE id IN ('NPHOTI','NPHT','NPHTI','NPHTH','NPHOT','NPHO2') ORDER BY id`, 'Check problematic groups');
  if (check) check.forEach(g => console.log(`  ${g.id} | ${g.ten_nhom}`));

  // Drop FK constraints first (some may already be dropped)
  await runSQL(`
    ALTER TABLE lo_rung_geojson DROP CONSTRAINT IF EXISTS lo_rung_geojson_id_lo_rung_fkey;
    ALTER TABLE lo_rung DROP CONSTRAINT IF EXISTS lo_rung_id_nhom_fkey;
    ALTER TABLE lo_rung DROP CONSTRAINT IF EXISTS lo_rung_id_chu_rung_fkey;
    ALTER TABLE chu_rung DROP CONSTRAINT IF EXISTS chu_rung_id_nhom_fkey;
  `, 'Drop FK constraints');
  await delay(2000);

  // Fix the 2 remaining groups: NPHOTI → NPHTI, NPHT → NPHTH
  console.log('\n=== Fixing remaining groups ===\n');

  // NPHOTI (Hợp Tiến) → NPHTI (now safe since old NPHTI → NPHO2)
  await runSQL(`UPDATE nhom_ccr SET id = 'NPHTI', ma_nhom = 'NPHTI' WHERE id = 'NPHOTI';`, 'Fix NPHOTI → NPHTI');
  await delay(1000);

  // NPHT (Hồng Thái) → NPHTH (now safe since old NPHTH → NPHOT)
  await runSQL(`UPDATE nhom_ccr SET id = 'NPHTH', ma_nhom = 'NPHTH' WHERE id = 'NPHT';`, 'Fix NPHT → NPHTH');
  await delay(1000);

  // Fix chu_rung references for these 2 groups
  console.log('\n=== Fixing chu_rung references ===\n');

  // Get owners still referencing old group IDs
  const oldOwners1 = await runSQL(`SELECT id FROM chu_rung WHERE id_nhom = 'NPHOTI'`, 'Find owners with NPHOTI');
  if (oldOwners1 && oldOwners1.length > 0) {
    console.log(`  ${oldOwners1.length} owners still ref NPHOTI`);
    await runSQL(`UPDATE chu_rung SET id_nhom = 'NPHTI' WHERE id_nhom = 'NPHOTI';`, 'Fix chu_rung → NPHTI');
  }

  const oldOwners2 = await runSQL(`SELECT id FROM chu_rung WHERE id_nhom = 'NPHT'`, 'Find owners with NPHT');
  if (oldOwners2 && oldOwners2.length > 0) {
    console.log(`  ${oldOwners2.length} owners still ref NPHT`);
    await runSQL(`UPDATE chu_rung SET id_nhom = 'NPHTH' WHERE id_nhom = 'NPHT';`, 'Fix chu_rung → NPHTH');
  }

  // Fix lo_rung references
  console.log('\n=== Fixing lo_rung references ===\n');
  await runSQL(`UPDATE lo_rung SET id_nhom = 'NPHTI' WHERE id_nhom = 'NPHOTI';`, 'Fix lo_rung nhom → NPHTI');
  await delay(500);
  await runSQL(`UPDATE lo_rung SET id_nhom = 'NPHTH' WHERE id_nhom = 'NPHT';`, 'Fix lo_rung nhom → NPHTH');
  await delay(1000);

  // Now also need to fix the owner IDs and plot IDs for these 2 groups
  // Owners with old-format IDs that reference NPHOTI/NPHT
  const fixOwners1 = await runSQL(`SELECT id, id_nhom FROM chu_rung WHERE id LIKE 'NPHOTI.%' ORDER BY id`, 'Find NPHOTI owners to fix ID');
  if (fixOwners1 && fixOwners1.length > 0) {
    console.log(`  ${fixOwners1.length} owners need ID prefix fix NPHOTI→NPHTI`);
    for (const o of fixOwners1) {
      const newId = o.id.replace('NPHOTI.', 'NPHTI.');
      // Fix plots first
      await runSQL(`UPDATE lo_rung SET id_chu_rung = ${esc(newId)} WHERE id_chu_rung = ${esc(o.id)};`, `Fix plots ref ${o.id}`);
      // Fix lo_rung IDs that start with this owner
      await runSQL(`UPDATE lo_rung SET id = replace(id, ${esc(o.id + '.')}, ${esc(newId + '.')}) WHERE id LIKE ${esc(o.id + '.%')};`, `Fix plot IDs ${o.id}`);
      // Fix geojson
      await runSQL(`UPDATE lo_rung_geojson SET id_lo_rung = replace(id_lo_rung, ${esc(o.id + '.')}, ${esc(newId + '.')}) WHERE id_lo_rung LIKE ${esc(o.id + '.%')};`, `Fix geojson ${o.id}`);
      // Finally fix owner ID
      await runSQL(`UPDATE chu_rung SET id = ${esc(newId)} WHERE id = ${esc(o.id)};`, `Fix owner ${o.id} → ${newId}`);
      await delay(300);
    }
  }

  const fixOwners2 = await runSQL(`SELECT id, id_nhom FROM chu_rung WHERE id LIKE 'NPHT.%' ORDER BY id`, 'Find NPHT owners to fix ID');
  if (fixOwners2 && fixOwners2.length > 0) {
    console.log(`  ${fixOwners2.length} owners need ID prefix fix NPHT→NPHTH`);
    for (const o of fixOwners2) {
      const newId = o.id.replace('NPHT.', 'NPHTH.');
      await runSQL(`UPDATE lo_rung SET id_chu_rung = ${esc(newId)} WHERE id_chu_rung = ${esc(o.id)};`, `Fix plots ref ${o.id}`);
      await runSQL(`UPDATE lo_rung SET id = replace(id, ${esc(o.id + '.')}, ${esc(newId + '.')}) WHERE id LIKE ${esc(o.id + '.%')};`, `Fix plot IDs ${o.id}`);
      await runSQL(`UPDATE lo_rung_geojson SET id_lo_rung = replace(id_lo_rung, ${esc(o.id + '.')}, ${esc(newId + '.')}) WHERE id_lo_rung LIKE ${esc(o.id + '.%')};`, `Fix geojson ${o.id}`);
      await runSQL(`UPDATE chu_rung SET id = ${esc(newId)} WHERE id = ${esc(o.id)};`, `Fix owner ${o.id} → ${newId}`);
      await delay(300);
    }
  }

  // Re-add FK constraints
  console.log('\n=== Re-add FK constraints ===\n');
  await runSQL(`
    ALTER TABLE chu_rung ADD CONSTRAINT chu_rung_id_nhom_fkey FOREIGN KEY (id_nhom) REFERENCES nhom_ccr(id) ON DELETE SET NULL;
  `, 'FK: chu_rung → nhom_ccr');
  await delay(1000);

  await runSQL(`
    ALTER TABLE lo_rung ADD CONSTRAINT lo_rung_id_nhom_fkey FOREIGN KEY (id_nhom) REFERENCES nhom_ccr(id) ON DELETE SET NULL;
  `, 'FK: lo_rung.id_nhom → nhom_ccr');
  await delay(1000);

  await runSQL(`
    ALTER TABLE lo_rung ADD CONSTRAINT lo_rung_id_chu_rung_fkey FOREIGN KEY (id_chu_rung) REFERENCES chu_rung(id) ON DELETE SET NULL;
  `, 'FK: lo_rung.id_chu_rung → chu_rung');
  await delay(1000);

  await runSQL(`
    ALTER TABLE lo_rung_geojson ADD CONSTRAINT lo_rung_geojson_id_lo_rung_fkey FOREIGN KEY (id_lo_rung) REFERENCES lo_rung(id) ON DELETE CASCADE;
  `, 'FK: lo_rung_geojson → lo_rung');
  await delay(1000);

  // Final verify
  console.log('\n=== Final verification ===\n');
  const groups = await runSQL('SELECT id, ten_nhom FROM nhom_ccr ORDER BY id', 'All groups');
  if (groups) {
    console.log(`${groups.length} groups:`);
    groups.forEach(g => {
      const code = g.id.replace('NP', '');
      console.log(`  ${g.id} (${code.length} chars) | ${g.ten_nhom}`);
    });
  }

  const sample = await runSQL('SELECT id FROM lo_rung ORDER BY id LIMIT 3', 'Sample plot IDs');
  if (sample) sample.forEach(r => console.log(`  Plot: ${r.id}`));

  const counts = await runSQL(`
    SELECT 'nhom_ccr' as tbl, count(*) as cnt FROM nhom_ccr
    UNION ALL SELECT 'chu_rung', count(*) FROM chu_rung
    UNION ALL SELECT 'lo_rung', count(*) FROM lo_rung
    UNION ALL SELECT 'lo_rung_geojson', count(*) FROM lo_rung_geojson;
  `, 'Counts');
  if (counts) counts.forEach(r => console.log(`  ${r.tbl}: ${r.cnt}`));

  console.log('\nDONE!');
}

run().catch(err => console.error('Fatal:', err));
