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
  console.log('Seeding stakeholder data (ben_lien_quan)...\n');

  // Nhóm BLQ categories (from stakeholder types a-h):
  // a) Cơ quan sáng kiến FSC quốc gia
  // b) Cơ quan lâm nghiệp nhà nước
  // c) Chính quyền địa phương
  // d) NGOs xã hội môi trường
  // e) Đại diện cộng đồng
  // f) Tổ chức công đoàn
  // g) Nhà thầu khai thác/trồng rừng
  // h) NGOs quốc tế

  await runSQL(`
    INSERT INTO ben_lien_quan (id, ten_to_chuc, email, dia_chi, dien_thoai, nguoi_dai_dien, website, nhom_blq) VALUES
    ('BLQ_001', 'Văn phòng đại diện IKEA Trading', 'nhung.quach@ikea.com', 'Lầu 4, tòa nhà Broadway D, 152 Nguyễn Lương Bằng, phường Tân Phú, quận 7, TP Hồ Chí Minh', '(08) 54135888', 'Ms. Quach Hong Nhung - Forestry Coordinator, IKEA South East Asia', 'https://www.ikea.com', 'Khách hàng'),
    ('BLQ_002', 'SNV - Tổ chức Phát triển Hà Lan', 'AVuThiQue@snworld.org', 'Nhà B, Tầng 6, Khách sạn La Thành, 218 Đội Cấn, Hà Nội', '(04) 38463791', 'Vu Thi Que Anh - Project Manager FORCES', 'https://www.snv.org', 'NGOs quốc tế'),
    ('BLQ_003', 'Trung tâm nghiên cứu biến đổi khí hậu ở miền trung Việt Nam', 'hothanhha@huaf.edu.vn', '102 Phung Hung Street, Hue city, Vietnam', '0989639171', 'Dr. Ho Thanh Ha - Director', 'https://www.huaf.edu.vn', 'NGOs xã hội môi trường'),
    ('BLQ_004', 'SFMI - Viện Quản lý rừng bền vững và Chứng chỉ rừng', '', 'Hà Nội, Việt Nam', '', '', 'https://www.sfmi.vn', 'Cơ quan sáng kiến FSC quốc gia'),
    ('BLQ_005', 'Chi cục Kiểm lâm tỉnh', '', '', '', '', '', 'Cơ quan lâm nghiệp nhà nước'),
    ('BLQ_006', 'UBND xã / Hạt Kiểm lâm huyện', '', '', '', '', '', 'Chính quyền địa phương'),
    ('BLQ_007', 'Cộng đồng dân cư thôn bản xung quanh rừng', '', '', '', '', '', 'Đại diện cộng đồng'),
    ('BLQ_008', 'Công đoàn / Hiệp hội công nhân lâm nghiệp', '', '', '', '', '', 'Tổ chức công đoàn'),
    ('BLQ_009', 'Nhà thầu khai thác, trồng rừng', '', '', '', '', '', 'Nhà thầu khai thác/trồng rừng')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert stakeholders');

  // Verify
  const result = await runSQL(`
    SELECT id, ten_to_chuc, nhom_blq, email FROM ben_lien_quan ORDER BY id;
  `, 'Verify stakeholders');

  if (result) {
    console.log(`Total: ${result.length} stakeholders\n`);
    result.forEach(r => console.log(`  ${r.id}: ${r.ten_to_chuc} [${r.nhom_blq}] ${r.email || ''}`));
  }

  console.log('\nDone!');
}

run().catch(err => console.error('Fatal:', err));
