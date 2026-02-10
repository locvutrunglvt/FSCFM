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

function esc(s) {
  if (s === null || s === undefined || s === '') return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function generate3CharCode(name) {
  const clean = removeDiacritics(name.trim()).toUpperCase();
  const words = clean.split(/\s+/);

  if (words.length === 1) {
    // Single word: first 3 chars
    return words[0].substring(0, 3).padEnd(3, 'X');
  }
  // Check if last "word" is a number (e.g., "Chu 1", "Quan Vuong 2")
  const lastWord = words[words.length - 1];
  if (/^\d+$/.test(lastWord) && words.length >= 2) {
    // Letter(s) from name + number
    const nameWords = words.slice(0, -1);
    const prefix = nameWords.map(w => w.charAt(0)).join('');
    return (prefix + lastWord).substring(0, 3).padEnd(3, 'X');
  }
  if (words.length === 2) {
    // First char of word1 + first 2 chars of word2
    return (words[0].charAt(0) + words[1].substring(0, 2)).substring(0, 3);
  }
  // 3+ words: first char of each word
  return words.map(w => w.charAt(0)).join('').substring(0, 3);
}

async function run() {
  console.log('=== STEP 1: Read current data ===\n');

  const groups = await runSQL('SELECT id, ma_nhom, ten_nhom FROM nhom_ccr ORDER BY id', 'Read groups');
  if (!groups) { console.error('Failed to read groups'); return; }
  console.log(`  Groups: ${groups.length}`);

  const owners = await runSQL('SELECT id, id_nhom FROM chu_rung ORDER BY id', 'Read owners');
  if (!owners) { console.error('Failed to read owners'); return; }
  console.log(`  Owners: ${owners.length}`);

  await delay(2000);

  const plots = await runSQL('SELECT id, id_nhom, id_chu_rung FROM lo_rung ORDER BY id LIMIT 1', 'Read plots sample');
  console.log(`  (Will process plots in batches)\n`);

  // STEP 2: Generate new 3-char codes
  console.log('=== STEP 2: Generate 3-char group codes ===\n');

  const used = {};
  const groupMapping = {}; // old_id → new_id

  groups.forEach(g => {
    const name = (g.ten_nhom || '').replace(/^Nhóm\s*/i, '').trim();
    let code = generate3CharCode(name);

    // Resolve collisions
    if (used[code]) {
      // Try first 2 of word1 + first 1 of word2
      const clean = removeDiacritics(name.trim()).toUpperCase();
      const words = clean.split(/\s+/);
      if (words.length >= 2) {
        code = (words[0].substring(0, 2) + words[1].charAt(0)).substring(0, 3);
      }
      if (used[code]) {
        // Append number
        let n = 2;
        const base = code.substring(0, 2);
        while (used[base + n]) n++;
        code = base + n;
      }
    }
    used[code] = g.ten_nhom;
    const oldId = g.id;
    const newId = 'NP' + code;
    groupMapping[oldId] = newId;
    console.log(`  ${oldId.padEnd(8)} → ${newId.padEnd(7)} (${g.ten_nhom})`);
  });

  // STEP 3: Generate owner ID mapping (old 4-digit → new 3-digit)
  console.log('\n=== STEP 3: Build owner ID mapping ===\n');

  const ownerMapping = {}; // old_id → new_id
  // Group owners by their group
  const ownersByGroup = {};
  owners.forEach(o => {
    if (!ownersByGroup[o.id_nhom]) ownersByGroup[o.id_nhom] = [];
    ownersByGroup[o.id_nhom].push(o);
  });

  Object.keys(ownersByGroup).sort().forEach(gid => {
    const newGid = groupMapping[gid] || gid;
    const groupOwners = ownersByGroup[gid].sort((a, b) => a.id.localeCompare(b.id));
    groupOwners.forEach((o, idx) => {
      const newOwnerId = `${newGid}.${String(idx + 1).padStart(3, '0')}`;
      ownerMapping[o.id] = newOwnerId;
    });
  });

  console.log(`  Mapped ${Object.keys(ownerMapping).length} owners`);
  // Show sample
  const sampleOwners = Object.entries(ownerMapping).slice(0, 5);
  sampleOwners.forEach(([old, nw]) => console.log(`    ${old} → ${nw}`));
  console.log(`    ...`);

  // STEP 4: Drop FK constraints
  console.log('\n=== STEP 4: Drop FK constraints ===\n');

  await runSQL(`
    ALTER TABLE lo_rung_geojson DROP CONSTRAINT IF EXISTS lo_rung_geojson_id_lo_rung_fkey;
    ALTER TABLE lo_rung DROP CONSTRAINT IF EXISTS lo_rung_id_nhom_fkey;
    ALTER TABLE lo_rung DROP CONSTRAINT IF EXISTS lo_rung_id_chu_rung_fkey;
    ALTER TABLE chu_rung DROP CONSTRAINT IF EXISTS chu_rung_id_nhom_fkey;
  `, 'Drop FK constraints');
  await delay(2000);

  // STEP 5: Update nhom_ccr IDs
  console.log('\n=== STEP 5: Update nhom_ccr IDs ===\n');

  for (const [oldId, newId] of Object.entries(groupMapping)) {
    if (oldId === newId) continue;
    await runSQL(`UPDATE nhom_ccr SET id = ${esc(newId)}, ma_nhom = ${esc(newId)} WHERE id = ${esc(oldId)};`, `nhom ${oldId} → ${newId}`);
    await delay(500);
  }

  // STEP 6: Update chu_rung IDs and id_nhom
  console.log('\n=== STEP 6: Update chu_rung ===\n');

  const BATCH = 100;
  const ownerEntries = Object.entries(ownerMapping);

  for (let i = 0; i < ownerEntries.length; i += BATCH) {
    const batch = ownerEntries.slice(i, i + BATCH);
    // Build SQL: update id and id_nhom for each owner
    const updates = batch.map(([oldId, newId]) => {
      const newGid = newId.split('.')[0]; // NP + 3char
      return `UPDATE chu_rung SET id = ${esc(newId)}, id_nhom = ${esc(newGid)} WHERE id = ${esc(oldId)};`;
    }).join('\n');
    await runSQL(updates, `Owners ${i + 1}-${Math.min(i + BATCH, ownerEntries.length)} / ${ownerEntries.length}`);
    await delay(1500);
  }

  // STEP 7: Update lo_rung IDs (id, id_nhom, id_chu_rung) - need to read all and remap
  console.log('\n=== STEP 7: Update lo_rung ===\n');

  // Read all lo_rung IDs in batches
  let allPlots = [];
  let offset = 0;
  while (true) {
    const batch = await runSQL(`SELECT id, id_nhom, id_chu_rung FROM lo_rung ORDER BY id LIMIT 1000 OFFSET ${offset}`, `Read lo_rung offset ${offset}`);
    if (!batch || batch.length === 0) break;
    allPlots = allPlots.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
    await delay(1000);
  }
  console.log(`  Total lo_rung: ${allPlots.length}`);

  // Build plot ID mapping
  const plotMapping = {};
  allPlots.forEach(p => {
    const newGid = groupMapping[p.id_nhom] || p.id_nhom;
    const newOwnerId = ownerMapping[p.id_chu_rung] || p.id_chu_rung;
    // Extract plot code from old ID: last part after owner ID
    const plotCode = p.id.substring(p.id_chu_rung.length + 1); // skip "NPXX.0001."
    const newPlotId = `${newOwnerId}.${plotCode}`;
    plotMapping[p.id] = { newId: newPlotId, newGid, newOwnerId };
  });

  // Update in batches
  const plotEntries = Object.entries(plotMapping);
  const PLOT_BATCH = 50;
  for (let i = 0; i < plotEntries.length; i += PLOT_BATCH) {
    const batch = plotEntries.slice(i, i + PLOT_BATCH);
    const updates = batch.map(([oldId, { newId, newGid, newOwnerId }]) => {
      return `UPDATE lo_rung SET id = ${esc(newId)}, id_nhom = ${esc(newGid)}, id_chu_rung = ${esc(newOwnerId)} WHERE id = ${esc(oldId)};`;
    }).join('\n');
    await runSQL(updates, `Lo_rung ${i + 1}-${Math.min(i + PLOT_BATCH, plotEntries.length)} / ${plotEntries.length}`);
    await delay(1500);
  }

  // STEP 8: Update lo_rung_geojson references
  console.log('\n=== STEP 8: Update lo_rung_geojson ===\n');

  let allGeo = [];
  offset = 0;
  while (true) {
    const batch = await runSQL(`SELECT id, id_lo_rung FROM lo_rung_geojson ORDER BY id LIMIT 1000 OFFSET ${offset}`, `Read geojson offset ${offset}`);
    if (!batch || batch.length === 0) break;
    allGeo = allGeo.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
    await delay(1000);
  }
  console.log(`  Total geojson rows: ${allGeo.length}`);

  const GEO_BATCH = 200;
  for (let i = 0; i < allGeo.length; i += GEO_BATCH) {
    const batch = allGeo.slice(i, i + GEO_BATCH);
    const updates = batch.map(row => {
      const pm = plotMapping[row.id_lo_rung];
      if (!pm) return '';
      return `UPDATE lo_rung_geojson SET id_lo_rung = ${esc(pm.newId)} WHERE id = ${row.id};`;
    }).filter(Boolean).join('\n');
    if (!updates) continue;
    await runSQL(updates, `Geojson ${i + 1}-${Math.min(i + GEO_BATCH, allGeo.length)} / ${allGeo.length}`);
    await delay(1500);
  }

  // STEP 9: Re-add FK constraints
  console.log('\n=== STEP 9: Re-add FK constraints ===\n');

  await runSQL(`
    ALTER TABLE chu_rung ADD CONSTRAINT chu_rung_id_nhom_fkey FOREIGN KEY (id_nhom) REFERENCES nhom_ccr(id) ON DELETE SET NULL;
    ALTER TABLE lo_rung ADD CONSTRAINT lo_rung_id_nhom_fkey FOREIGN KEY (id_nhom) REFERENCES nhom_ccr(id) ON DELETE SET NULL;
    ALTER TABLE lo_rung ADD CONSTRAINT lo_rung_id_chu_rung_fkey FOREIGN KEY (id_chu_rung) REFERENCES chu_rung(id) ON DELETE SET NULL;
    ALTER TABLE lo_rung_geojson ADD CONSTRAINT lo_rung_geojson_id_lo_rung_fkey FOREIGN KEY (id_lo_rung) REFERENCES lo_rung(id) ON DELETE CASCADE;
  `, 'Re-add FK constraints');
  await delay(2000);

  // STEP 10: Verify
  console.log('\n=== STEP 10: Verify ===\n');

  const verifyGroups = await runSQL('SELECT id, ma_nhom, ten_nhom FROM nhom_ccr ORDER BY id LIMIT 10', 'Verify groups');
  if (verifyGroups) verifyGroups.forEach(g => console.log(`  ${g.id} | ${g.ten_nhom}`));

  const verifyOwners = await runSQL('SELECT id, id_nhom FROM chu_rung ORDER BY id LIMIT 5', 'Verify owners');
  if (verifyOwners) verifyOwners.forEach(o => console.log(`  ${o.id} | nhom: ${o.id_nhom}`));

  const verifyPlots = await runSQL('SELECT id, id_nhom, id_chu_rung FROM lo_rung ORDER BY id LIMIT 5', 'Verify plots');
  if (verifyPlots) verifyPlots.forEach(p => console.log(`  ${p.id} | nhom: ${p.id_nhom} | chu_rung: ${p.id_chu_rung}`));

  // Check all IDs follow new format
  const badIds = await runSQL(`
    SELECT 'nhom_ccr' as tbl, count(*) FILTER (WHERE length(id) - length('NP') != 3) as bad FROM nhom_ccr
    UNION ALL
    SELECT 'chu_rung', count(*) FILTER (WHERE id NOT LIKE '%.___') FROM chu_rung
    UNION ALL
    SELECT 'lo_rung_total', count(*) FROM lo_rung;
  `, 'Check ID format');
  if (badIds) badIds.forEach(r => console.log(`  ${r.tbl}: ${r.bad}`));

  console.log('\nDONE!');
}

run().catch(err => console.error('Fatal:', err));
