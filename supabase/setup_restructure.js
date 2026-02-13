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
  console.log('=== RESTRUCTURE: Menu + Plans + Sample Data ===\n');

  // ============================================================
  // PART 1: FIX MENU STRUCTURE
  // ============================================================
  console.log('=== PART 1: Fix menu structure ===');

  // 1a. Delete duplicate reference items from QLRBV (ids 55-58)
  await runSQL(`DELETE FROM menu WHERE id IN (55, 56, 57, 58);`, 'Delete QLRBV reference duplicates');
  await sleep(1000);

  // 1b. Update old TÀI LIỆU THAM KHẢO items to use correct view_names
  await runSQL(`UPDATE menu SET view_name = 'TL_ThuocBVTV', module = 'Danh mục thuốc BVTV' WHERE id = 20;`, 'Update DM_thuoc_BVTV → TL_ThuocBVTV');
  await sleep(500);
  await runSQL(`UPDATE menu SET view_name = 'TL_CayTrong', module = 'Danh mục cây trồng' WHERE id = 21;`, 'Update DM_caytrong → TL_CayTrong');
  await sleep(500);
  await runSQL(`UPDATE menu SET view_name = 'TL_PhanBon', module = 'Danh mục phân bón' WHERE id = 22;`, 'Update DM_phanbon → TL_PhanBon');
  await sleep(500);
  await runSQL(`UPDATE menu SET view_name = 'TL_NguonGocGiong', module = 'Nguồn gốc cây giống' WHERE id = 23;`, 'Update Nguongoc_giong → TL_NguonGocGiong');
  await sleep(500);

  // 1c. Move BoTieuChuan_FSC to TÀI LIỆU THAM KHẢO
  await runSQL(`UPDATE menu SET nhom = 'TÀI LIỆU THAM KHẢO' WHERE id = 10;`, 'Move BoTieuChuan_FSC to TÀI LIỆU THAM KHẢO');
  await sleep(500);

  // 1d. Add EUDR reference to TÀI LIỆU THAM KHẢO
  const existEudrTL = await runSQL(`SELECT id FROM menu WHERE nhom = 'TÀI LIỆU THAM KHẢO' AND view_name = 'EUDR_TaiLieu';`, 'Check EUDR ref in TL');
  if (!existEudrTL || existEudrTL.length === 0) {
    await runSQL(`INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen)
      VALUES ('TÀI LIỆU THAM KHẢO', 'Tài liệu EUDR', 'EUDR_TaiLieu', '1', '0', '0', '0', '');`, 'Add EUDR ref to TÀI LIỆU THAM KHẢO');
  }
  await sleep(1000);

  // ============================================================
  // PART 2: NEW PLAN TABLES
  // ============================================================
  console.log('\n=== PART 2: Create plan tables ===');

  // 2a. Kế hoạch trồng rừng
  await runSQL(`
    CREATE TABLE IF NOT EXISTS kh_trong_rung (
      id TEXT PRIMARY KEY,
      id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
      id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
      id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
      nam INT,
      loai_cay TEXT,
      giong TEXT,
      dien_tich NUMERIC(12,2) DEFAULT 0,
      mat_do INT DEFAULT 0,
      so_cay INT DEFAULT 0,
      thoi_diem_trong TEXT,
      phuong_phap TEXT,
      kinh_phi NUMERIC(15,2) DEFAULT 0,
      nguon_giong TEXT,
      trang_thai TEXT DEFAULT 'Kế hoạch',
      nguoi_lap TEXT,
      ghi_chu TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE kh_trong_rung');
  await sleep(2000);

  // 2b. Kế hoạch khai thác
  await runSQL(`
    CREATE TABLE IF NOT EXISTS kh_khai_thac (
      id TEXT PRIMARY KEY,
      id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
      id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
      id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
      nam INT,
      loai_khai_thac TEXT,
      dien_tich NUMERIC(12,2) DEFAULT 0,
      san_luong_du_kien NUMERIC(12,2) DEFAULT 0,
      thoi_gian_bat_dau DATE,
      thoi_gian_ket_thuc DATE,
      phuong_phap TEXT,
      don_vi_khai_thac TEXT,
      kinh_phi NUMERIC(15,2) DEFAULT 0,
      trang_thai TEXT DEFAULT 'Kế hoạch',
      nguoi_lap TEXT,
      ghi_chu TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE kh_khai_thac');
  await sleep(2000);

  // 2c. Kế hoạch tập huấn
  await runSQL(`
    CREATE TABLE IF NOT EXISTS kh_tap_huan (
      id TEXT PRIMARY KEY,
      id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
      nam INT,
      ten_khoa TEXT,
      noi_dung TEXT,
      doi_tuong TEXT,
      so_nguoi_du_kien INT DEFAULT 0,
      thoi_gian_du_kien TEXT,
      dia_diem TEXT,
      giang_vien TEXT,
      kinh_phi NUMERIC(15,2) DEFAULT 0,
      trang_thai TEXT DEFAULT 'Kế hoạch',
      nguoi_lap TEXT,
      ghi_chu TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE kh_tap_huan');
  await sleep(2000);

  // 2d. Kế hoạch cây giống
  await runSQL(`
    CREATE TABLE IF NOT EXISTS kh_cay_giong (
      id TEXT PRIMARY KEY,
      id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
      nam INT,
      loai_cay TEXT,
      giong TEXT,
      so_luong_cay INT DEFAULT 0,
      nha_cung_cap TEXT,
      dia_chi_ncc TEXT,
      thoi_gian_cung_cap TEXT,
      yeu_cau_chat_luong TEXT,
      co_chung_nhan TEXT,
      kinh_phi NUMERIC(15,2) DEFAULT 0,
      trang_thai TEXT DEFAULT 'Kế hoạch',
      nguoi_lap TEXT,
      ghi_chu TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `, 'CREATE kh_cay_giong');
  await sleep(2000);

  // Triggers
  for (const tbl of ['kh_trong_rung','kh_khai_thac','kh_tap_huan','kh_cay_giong']) {
    await runSQL(`
      CREATE TRIGGER IF NOT EXISTS trg_${tbl}_updated
        BEFORE UPDATE ON ${tbl}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `, `Trigger ${tbl}`).catch(() => {});
    await sleep(500);
  }

  // Indexes
  await runSQL(`
    CREATE INDEX IF NOT EXISTS idx_kh_tr_nhom ON kh_trong_rung(id_nhom);
    CREATE INDEX IF NOT EXISTS idx_kh_tr_nam ON kh_trong_rung(nam);
    CREATE INDEX IF NOT EXISTS idx_kh_kt_nhom ON kh_khai_thac(id_nhom);
    CREATE INDEX IF NOT EXISTS idx_kh_kt_nam ON kh_khai_thac(nam);
    CREATE INDEX IF NOT EXISTS idx_kh_th_nhom ON kh_tap_huan(id_nhom);
    CREATE INDEX IF NOT EXISTS idx_kh_th_nam ON kh_tap_huan(nam);
    CREATE INDEX IF NOT EXISTS idx_kh_cg_nhom ON kh_cay_giong(id_nhom);
    CREATE INDEX IF NOT EXISTS idx_kh_cg_nam ON kh_cay_giong(nam);
  `, 'Create indexes for plan tables');
  await sleep(1000);

  // RLS
  for (const tbl of ['kh_trong_rung','kh_khai_thac','kh_tap_huan','kh_cay_giong']) {
    await runSQL(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY;`, `RLS enable ${tbl}`);
    await sleep(300);
    await runSQL(`CREATE POLICY "Allow all for authenticated" ON ${tbl} FOR ALL TO authenticated USING (true) WITH CHECK (true);`, `RLS policy ${tbl}`);
    await sleep(500);
  }

  // ============================================================
  // PART 2b: ADD PLAN MENU ITEMS
  // ============================================================
  console.log('\n=== PART 2b: Add plan menu items ===');
  const planMenus = [
    { module: 'KH Tập huấn', view: 'KH_Taphuan' },
    { module: 'KH Cây giống', view: 'KH_CayGiong' },
    { module: 'KH Giám sát', view: 'KH_GiamSat' }
  ];
  for (const pm of planMenus) {
    const exists = await runSQL(`SELECT id FROM menu WHERE view_name = '${pm.view}';`, `Check menu ${pm.view}`);
    if (!exists || exists.length === 0) {
      await runSQL(`INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen)
        VALUES ('QUẢN LÝ RỪNG BỀN VỮNG', '${pm.module}', '${pm.view}', '1', '1', '1', '1', '');`, `Add menu ${pm.view}`);
    }
    await sleep(500);
  }
  // KH_GiamSat already exists as KH_GiamSat_Nhom in GIÁM SÁT group, just need to map views

  // ============================================================
  // PART 3: SAMPLE DATA - CÂY TRỒNG
  // ============================================================
  console.log('\n=== PART 3: Sample data - Cây trồng ===');
  await runSQL(`
    INSERT INTO danh_muc_cay_trong (id, ten_tieng_viet, ten_khoa_hoc, ho_thuc_vat, nhom_cay, vung_phan_bo, dac_diem, cong_dung, ghi_chu, trang_thai) VALUES
    ('CT001', 'Keo tai tượng', 'Acacia mangium Willd.', 'Fabaceae (Họ Đậu)', 'Cây gỗ lớn nhập nội', 'Toàn quốc, đặc biệt vùng Bắc và Trung Bộ', 'Cây gỗ lớn, cao 25-30m, đường kính 40-60cm. Lá hình elip rộng (phyllodes). Sinh trưởng nhanh, chu kỳ 6-8 năm. Chịu đất nghèo, đất chua.', 'Gỗ nguyên liệu giấy, dăm gỗ, ván MDF, gỗ xây dựng. Cải tạo đất, chống xói mòn.', 'Giống FSC phổ biến nhất tại Việt Nam. EN: Mangium / Black wattle', 'Act'),
    ('CT002', 'Keo lai (nuôi cấy mô)', 'Acacia hybrid (A. mangium x A. auriculiformis)', 'Fabaceae (Họ Đậu)', 'Cây gỗ lớn lai tạo', 'Toàn quốc', 'Lai tự nhiên giữa Keo tai tượng và Keo lá tràm. Sinh trưởng rất nhanh, MAI 20-30 m³/ha/năm. Nhân giống bằng nuôi cấy mô (tissue culture) đảm bảo đồng nhất di truyền.', 'Gỗ dăm, gỗ xẻ, ván công nghiệp. Năng suất cao hơn bố mẹ 20-30%.', 'Giống chủ lực cho rừng trồng FSC. Mã giống BV: BV10, BV16, BV32, BV33, AH1, AH7. EN: Acacia hybrid (tissue culture)', 'Act'),
    ('CT003', 'Keo lai (giâm hom)', 'Acacia hybrid (A. mangium x A. auriculiformis)', 'Fabaceae (Họ Đậu)', 'Cây gỗ lớn lai tạo', 'Toàn quốc', 'Cùng giống keo lai nhưng nhân giống bằng giâm hom. Chi phí thấp hơn nuôi cấy mô, nhưng tỷ lệ đồng nhất thấp hơn. Phù hợp quy mô nhỏ.', 'Gỗ nguyên liệu giấy, dăm gỗ, gỗ xây dựng.', 'Cần kiểm soát chất lượng hom giống. EN: Acacia hybrid (cutting)', 'Act'),
    ('CT004', 'Keo lá tràm', 'Acacia auriculiformis A.Cunn. ex Benth.', 'Fabaceae (Họ Đậu)', 'Cây gỗ lớn nhập nội', 'Miền Trung và Nam Bộ, đất cát ven biển', 'Cây gỗ trung bình-lớn, cao 15-25m. Lá biến dạng thành phyllode hình liềm. Rất chịu hạn, chịu đất cát nghèo, chịu mặn nhẹ. Chu kỳ 7-10 năm.', 'Gỗ nguyên liệu, củi, than. Phòng hộ chắn gió, chắn cát.', 'Thích hợp đất nghèo kiệt. EN: Earleaf acacia / Northern black wattle', 'Act'),
    ('CT005', 'Keo lưỡi liềm', 'Acacia crassicarpa A.Cunn. ex Benth.', 'Fabaceae (Họ Đậu)', 'Cây gỗ lớn nhập nội', 'Miền Trung, đất cát', 'Cây gỗ trung bình, cao 15-20m. Chịu đất cát, đất phèn, đất ngập nước tạm thời. Sinh trưởng nhanh ở vùng đất thấp ẩm.', 'Gỗ dăm, nguyên liệu giấy, cải tạo đất', 'Ít phổ biến hơn keo tai tượng và keo lai. EN: Brown salwood', 'Act'),
    ('CT006', 'Bạch đàn urô', 'Eucalyptus urophylla S.T.Blake', 'Myrtaceae (Họ Sim)', 'Cây gỗ lớn nhập nội', 'Bắc Bộ, Bắc Trung Bộ', 'Cây gỗ lớn, cao 25-40m. Thân thẳng, vỏ nứt dọc. Sinh trưởng nhanh, MAI 15-25 m³/ha/năm. Chịu lạnh tốt hơn E. camaldulensis.', 'Gỗ nguyên liệu giấy, dăm gỗ, ván công nghiệp, gỗ trụ mỏ.', 'Giống phổ biến: U6, PN14. EN: Timor mountain gum', 'Act'),
    ('CT007', 'Bạch đàn lai (UP, UE)', 'Eucalyptus urophylla x E. pellita / E. exserta', 'Myrtaceae (Họ Sim)', 'Cây gỗ lớn lai tạo', 'Bắc Bộ, Bắc Trung Bộ', 'Giống lai cho năng suất cao, chất lượng gỗ tốt. Nhân giống bằng nuôi cấy mô hoặc giâm hom. MAI có thể đạt 25-35 m³/ha/năm.', 'Gỗ dăm xuất khẩu, gỗ xẻ, ván MDF.', 'Giống mới năng suất cao: UP35, UP54, UP99. EN: Eucalyptus hybrid', 'Act'),
    ('CT008', 'Thông ba lá', 'Pinus kesiya Royle ex Gordon', 'Pinaceae (Họ Thông)', 'Cây gỗ lớn bản địa', 'Tây Nguyên, Lâm Đồng, Gia Lai', 'Cây gỗ lớn, cao 30-35m, đường kính 50-80cm. Lá kim 3 lá/bó. Mọc tự nhiên ở độ cao 700-1500m. Chu kỳ khai thác nhựa và gỗ 25-30 năm.', 'Gỗ xây dựng, đồ mộc, nhựa thông (colophon, turpentine).', 'Loài bản địa quan trọng Tây Nguyên. EN: Khasi pine / Three-needle pine', 'Act'),
    ('CT009', 'Thông nhựa', 'Pinus merkusii Jungh. & de Vriese', 'Pinaceae (Họ Thông)', 'Cây gỗ lớn bản địa', 'Bắc Trung Bộ, Quảng Bình, Quảng Trị', 'Cây gỗ lớn, cao 25-35m. Lá kim 2 lá/bó. Cho nhựa tốt, lượng nhựa 3-5 kg/cây/năm. Chịu nắng nóng.', 'Gỗ xây dựng, khai thác nhựa thông, cải tạo đất trọc.', 'Loài bản địa, cần bảo tồn quần thể tự nhiên. EN: Sumatran pine / Merkus pine', 'Act'),
    ('CT010', 'Sao đen', 'Hopea odorata Roxb.', 'Dipterocarpaceae (Họ Dầu)', 'Cây gỗ lớn bản địa', 'Nam Bộ, Đông Nam Bộ, Tây Nguyên', 'Cây gỗ lớn, cao 30-45m, đường kính 60-100cm. Gỗ nhóm II, rất bền, chống mối mọt. Mọc chậm, chu kỳ 40-60 năm.', 'Gỗ quý làm đồ mộc cao cấp, xây dựng, cây bóng mát đô thị.', 'Loài bản địa quý hiếm, trồng phục hồi rừng tự nhiên. EN: Iron wood / Ta-khian', 'Act'),
    ('CT011', 'Dầu rái', 'Dipterocarpus alatus Roxb. ex G.Don', 'Dipterocarpaceae (Họ Dầu)', 'Cây gỗ lớn bản địa', 'Nam Bộ, Tây Nguyên', 'Cây gỗ lớn, cao 40-50m. Thân thẳng, tán rộng. Nhựa dầu có giá trị. Gỗ nhóm III-IV. Mọc chậm.', 'Gỗ xây dựng, nhựa dầu (dầu rái), cây bóng mát, phục hồi rừng.', 'Loài biểu tượng rừng nhiệt đới VN. EN: Yang oil tree / Keruing', 'Act'),
    ('CT012', 'Lát hoa', 'Chukrasia tabularis A.Juss.', 'Meliaceae (Họ Xoan)', 'Cây gỗ lớn bản địa', 'Bắc Bộ, Bắc Trung Bộ', 'Cây gỗ lớn, cao 25-30m. Gỗ màu hồng đẹp, vân thớ mịn. Gỗ nhóm II. Mọc trung bình, chu kỳ 30-40 năm.', 'Gỗ quý làm đồ mộc mỹ nghệ, nội thất cao cấp.', 'Loài quý, khuyến khích trồng xen trong rừng FSC. EN: Chickrassy / Indian mahogany', 'Act'),
    ('CT013', 'Giổi xanh', 'Michelia mediocris Dandy', 'Magnoliaceae (Họ Mộc lan)', 'Cây gỗ lớn bản địa', 'Bắc Bộ, Trung Bộ, vùng núi', 'Cây gỗ lớn, cao 20-30m. Gỗ thơm, bền, ít co ngót. Gỗ nhóm II. Hoa thơm.', 'Gỗ mộc cao cấp, tinh dầu, cây bóng mát rừng.', 'Loài bản địa quý, trồng phục hồi HCVF. EN: Michelia', 'Act'),
    ('CT014', 'Trám trắng', 'Canarium album (Lour.) DC.', 'Burseraceae (Họ Trám)', 'Cây gỗ lớn bản địa', 'Bắc Bộ, Bắc Trung Bộ', 'Cây gỗ trung bình-lớn, cao 20-25m. Quả ăn được, nhựa thơm. Gỗ nhóm IV, dễ chế biến.', 'Gỗ, quả thực phẩm, nhựa, cây trồng xen.', 'LSNG có giá trị. Trồng xen trong rừng keo FSC. EN: Chinese white olive', 'Act'),
    ('CT015', 'Mỡ', 'Manglietia conifera Dandy', 'Magnoliaceae (Họ Mộc lan)', 'Cây gỗ lớn bản địa', 'Bắc Bộ, vùng núi cao 300-800m', 'Cây gỗ lớn, cao 25-30m. Thân thẳng, tán hẹp. Gỗ nhẹ, mềm, dễ gia công. Gỗ nhóm V.', 'Gỗ xẻ, gỗ dán, bao bì, bút chì. Trồng rừng sản xuất.', 'Loài bản địa phổ biến vùng Đông Bắc. EN: Manglietia', 'Act'),
    ('CT016', 'Quế', 'Cinnamomum cassia (L.) J.Presl', 'Lauraceae (Họ Long não)', 'Cây gỗ trung bình bản địa', 'Yên Bái, Quảng Nam, Quảng Ngãi', 'Cây gỗ trung bình, cao 10-15m. Vỏ và lá chứa tinh dầu quế (cinnamaldehyde). Thu hoạch vỏ từ năm thứ 5.', 'Vỏ quế gia vị, tinh dầu quế, gỗ. LSNG có giá trị kinh tế cao.', 'Cây LSNG quan trọng, trồng xen trong rừng FSC. EN: Cassia cinnamon / Chinese cinnamon', 'Act'),
    ('CT017', 'Tre lồ ô', 'Bambusa procera A.Chev. & A.Camus', 'Poaceae (Họ Hòa thảo)', 'Tre nứa bản địa', 'Tây Nguyên, Trung Bộ', 'Tre lớn, cao 15-20m, đường kính 8-12cm. Mọc cụm, sinh trưởng nhanh. Khai thác luân kỳ 3-4 năm.', 'Nguyên liệu giấy, ván tre, đan lát, xây dựng tạm.', 'LSNG quan trọng. Không phải gỗ theo EUDR. EN: Giant bamboo', 'Act'),
    ('CT018', 'Tếch', 'Tectona grandis L.f.', 'Lamiaceae (Họ Bạc hà)', 'Cây gỗ lớn nhập nội', 'Tây Nguyên, Đông Nam Bộ', 'Cây gỗ lớn, cao 25-35m. Gỗ cực kỳ bền, chống mối mọt tốt nhất. Gỗ nhóm I. Chu kỳ 30-50 năm.', 'Gỗ quý cao cấp: đóng tàu, đồ mộc, sàn nhà, nội thất.', 'Gỗ quý nhất thế giới. Trồng hạn chế ở VN. EN: Teak', 'Act')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert sample cây trồng');
  await sleep(2000);

  // ============================================================
  // PART 4: SAMPLE DATA - THUỐC BVTV (including FSC banned)
  // ============================================================
  console.log('\n=== PART 4: Sample data - Thuốc BVTV ===');
  await runSQL(`
    INSERT INTO danh_muc_thuoc_bvtv (id, ten_thuong_mai, hoat_chat, nhom_thuoc, doi_tuong_phong_tru, lieu_luong, cach_su_dung, thoi_gian_cach_ly, doc_tinh, ghi_chu, trang_thai) VALUES
    -- CÁC THUỐC ĐƯỢC PHÉP SỬ DỤNG TRONG FSC
    ('BVTV001', 'Regent 800WG', 'Fipronil 800g/kg', 'Neonicotinoid', 'Mối hại rễ cây con', '1-2g/gốc', 'Rắc quanh gốc khi trồng', '30 ngày', 'Độc tính II (Nguy hiểm)', 'FSC: CHỈ cho phép với ngoại lệ (derogation). Rất độc với ong và thủy sinh. KIỂM SOÁT CHẶT.', 'Act'),
    ('BVTV002', 'Confidor 200SL', 'Imidacloprid 200g/l', 'Neonicotinoid', 'Rệp, bọ cánh cứng hại keo', '0.5ml/l nước', 'Phun lên lá', '14 ngày', 'Độc tính II', 'FSC: CHỈ cho phép với ngoại lệ. Rất độc với ong mật. Hạn chế sử dụng gần nguồn nước.', 'Act'),
    ('BVTV003', 'Anvil 5SC', 'Hexaconazole 50g/l', 'Triazole fungicide', 'Bệnh phấn trắng, rỉ sắt keo', '1ml/l nước', 'Phun lên lá', '14 ngày', 'Độc tính III (Cẩn thận)', 'Được phép sử dụng. Thuốc trừ nấm phổ biến cho cây lâm nghiệp.', 'Act'),
    ('BVTV004', 'Validamycin 5SL', 'Validamycin A 50g/l', 'Kháng sinh thực vật', 'Bệnh khô cành keo, nấm rễ', '2ml/l nước', 'Tưới hoặc phun gốc', 'Không cần', 'Độc tính IV (Ít độc)', 'An toàn, nguồn gốc sinh học. Khuyến khích sử dụng trong FSC.', 'Act'),
    ('BVTV005', 'Bordeaux 1%', 'Đồng sulfat + Vôi', 'Thuốc trừ nấm đồng', 'Bệnh nấm tổng hợp', '10g CuSO4 + 10g vôi/l', 'Phun phòng ngừa', 'Không cần', 'Độc tính IV (Ít độc)', 'Thuốc truyền thống, được phép trong FSC và hữu cơ. Hạn chế tích lũy đồng trong đất.', 'Act'),
    ('BVTV006', 'Trichoderma spp.', 'Trichoderma viride, T. harzianum', 'Chế phẩm sinh học', 'Nấm gây bệnh rễ, thân', '5-10g/gốc', 'Trộn với đất hoặc tưới gốc', 'Không cần', 'Không độc', 'KHUYẾN KHÍCH SỬ DỤNG. Kiểm soát sinh học, an toàn, phù hợp FSC/EUDR.', 'Act'),
    ('BVTV007', 'Bacillus thuringiensis (BT)', 'Bacillus thuringiensis var. kurstaki', 'Chế phẩm sinh học', 'Sâu ăn lá keo, bạch đàn', '1-2g/l nước', 'Phun lên lá', 'Không cần', 'Không độc', 'KHUYẾN KHÍCH SỬ DỤNG. Thuốc sinh học, an toàn với thiên địch và ong.', 'Act'),
    ('BVTV008', 'Glyphosate 480SL', 'Glyphosate IPA 480g/l', 'Thuốc diệt cỏ', 'Cỏ dại trước khi trồng', '3-5l/ha', 'Phun trước trồng 15 ngày', '15 ngày', 'Độc tính III', 'FSC: Cho phép HẠN CHẾ. IARC phân loại 2A (có thể gây ung thư). Chỉ dùng khi không có giải pháp thay thế.', 'Act'),
    -- CÁC THUỐC BỊ CẤM BỞI FSC (FSC-POL-30-001)
    ('BVTV_BAN01', 'Thuốc cấm - Paraquat', 'Paraquat dichloride', 'Thuốc diệt cỏ', 'Cỏ dại', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC (Ia)', '⛔ CẤM BỞI FSC (FSC-POL-30-001). Cấm tại VN từ 2017 (TT 03/2018). Cực độc, không có thuốc giải.', 'CẤM'),
    ('BVTV_BAN02', 'Thuốc cấm - Endosulfan', 'Endosulfan', 'Thuốc trừ sâu cơ clo', 'Sâu đục thân', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC (Ia)', '⛔ CẤM BỞI FSC. Cấm theo Công ước Stockholm (POP). Cấm tại VN từ 2016. Tồn lưu lâu trong môi trường.', 'CẤM'),
    ('BVTV_BAN03', 'Thuốc cấm - Carbofuran', 'Carbofuran', 'Thuốc trừ sâu carbamate', 'Sâu đất, tuyến trùng', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC (Ib)', '⛔ CẤM BỞI FSC (FSC-POL-30-001). Cấm tại VN. Cực độc với chim và thủy sinh.', 'CẤM'),
    ('BVTV_BAN04', 'Thuốc cấm - Lindane (BHC)', 'Lindane (gamma-HCH)', 'Thuốc trừ sâu cơ clo', 'Mối, côn trùng đất', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC', '⛔ CẤM BỞI FSC. Cấm theo Công ước Stockholm. Cấm tại VN. Gây rối loạn nội tiết.', 'CẤM'),
    ('BVTV_BAN05', 'Thuốc cấm - Monocrotophos', 'Monocrotophos', 'Thuốc trừ sâu lân hữu cơ', 'Sâu hại tổng hợp', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC (Ia)', '⛔ CẤM BỞI FSC. Cấm tại VN từ 2003. Cực độc với người và chim. WHO Ia.', 'CẤM'),
    ('BVTV_BAN06', 'Thuốc cấm - Methamidophos', 'Methamidophos', 'Thuốc trừ sâu lân hữu cơ', 'Sâu ăn lá', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC (Ib)', '⛔ CẤM BỞI FSC. Cấm tại VN từ 2017. WHO Ib.', 'CẤM'),
    ('BVTV_BAN07', 'Thuốc cấm - DDT', 'DDT (Dichloro-diphenyl-trichloroethane)', 'Thuốc trừ sâu cơ clo', 'Côn trùng', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC', '⛔ CẤM BỞI FSC. Cấm theo Công ước Stockholm (POP). Cấm toàn cầu. Tồn lưu hàng chục năm.', 'CẤM'),
    ('BVTV_BAN08', 'Thuốc cấm - Chlordane', 'Chlordane', 'Thuốc trừ mối cơ clo', 'Mối', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC', '⛔ CẤM BỞI FSC. Cấm theo Công ước Stockholm. Cấm tại VN từ 1993.', 'CẤM'),
    ('BVTV_BAN09', 'Thuốc cấm - 2,4,5-T', '2,4,5-Trichlorophenoxyacetic acid', 'Thuốc diệt cỏ', 'Cỏ dại', 'N/A', 'N/A', 'N/A', 'CỰC ĐỘC', '⛔ CẤM BỞI FSC. Cấm tại VN. Thành phần chất da cam/dioxin.', 'CẤM'),
    ('BVTV_BAN10', 'Thuốc cấm - Atrazine', 'Atrazine', 'Thuốc diệt cỏ triazine', 'Cỏ dại', 'N/A', 'N/A', 'N/A', 'Độc tính III', '⛔ CẤM BỞI FSC (FSC-POL-30-001). Gây ô nhiễm nước ngầm lâu dài. Cấm tại EU.', 'CẤM')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert sample thuốc BVTV');
  await sleep(2000);

  // ============================================================
  // PART 5: SAMPLE DATA - PHÂN BÓN
  // ============================================================
  console.log('\n=== PART 5: Sample data - Phân bón ===');
  await runSQL(`
    INSERT INTO danh_muc_phan_bon (id, ten_phan_bon, loai_phan, thanh_phan, ham_luong, cach_su_dung, lieu_luong, nha_san_xuat, ghi_chu, trang_thai) VALUES
    ('PB001', 'NPK 16-16-8', 'Phân hỗn hợp vô cơ', 'N-P2O5-K2O', '16% N, 16% P2O5, 8% K2O', 'Bón lót khi trồng + bón thúc năm 1-2', '100-200g/gốc/lần', 'Lâm Thao / Bình Điền', 'Phổ biến nhất cho rừng trồng keo. FSC: hạn chế sử dụng, ưu tiên hữu cơ.', 'Act'),
    ('PB002', 'NPK 5-10-3', 'Phân hỗn hợp vô cơ', 'N-P2O5-K2O', '5% N, 10% P2O5, 3% K2O', 'Bón lót khi trồng', '200-300g/hố', 'Văn Điển / Ninh Bình', 'Phù hợp bón lót, hàm lượng lân cao giúp phát triển rễ.', 'Act'),
    ('PB003', 'Super lân Lâm Thao', 'Phân lân', 'Ca(H2PO4)2 + CaSO4', '16-18% P2O5', 'Bón lót khi trồng, trộn với đất', '200-500g/hố', 'Lâm Thao', 'Cung cấp lân và canxi cho đất chua. Rẻ, hiệu quả tốt trên đất đồi.', 'Act'),
    ('PB004', 'Vôi bột', 'Chất cải tạo đất', 'CaCO3 / Ca(OH)2', '>85% CaCO3', 'Rải đều trước khi làm đất, trước trồng 15-30 ngày', '500-1000 kg/ha', 'Địa phương', 'Cải tạo độ chua đất (pH < 4.5). FSC cho phép. Không gây ô nhiễm.', 'Act'),
    ('PB005', 'Phân chuồng hoai mục', 'Phân hữu cơ', 'Chất hữu cơ, N, P, K vi lượng', 'N 0.5-1%, P 0.3-0.5%', 'Bón lót khi trồng, trộn với đất trong hố', '2-5 kg/hố', 'Tự sản xuất / Mua', 'KHUYẾN KHÍCH trong FSC. Cải thiện cấu trúc đất, vi sinh vật đất.', 'Act'),
    ('PB006', 'Phân vi sinh Trichoderma', 'Phân vi sinh', 'Trichoderma spp., Bacillus spp.', '>10^8 CFU/g', 'Bón lót hoặc tưới gốc, kết hợp phân hữu cơ', '50-100g/gốc', 'SĐH / FUSA', 'KHUYẾN KHÍCH MẠNH trong FSC/EUDR. Phòng bệnh rễ, kích thích sinh trưởng.', 'Act'),
    ('PB007', 'Ure (46% N)', 'Phân đạm', 'CO(NH2)2', '46% N', 'Bón thúc năm 1-2, rạch rãnh quanh tán', '50-100g/gốc', 'Đạm Phú Mỹ / Đạm Cà Mau', 'FSC: Hạn chế sử dụng. Dễ bay hơi, gây chua đất. Bón vào đất ẩm.', 'Act'),
    ('PB008', 'KCl (Kali đỏ)', 'Phân kali', 'KCl', '60% K2O', 'Bón thúc năm 2-3, kết hợp NPK', '30-50g/gốc', 'Nhập khẩu (Belarus/Canada)', 'Tăng chống chịu hạn, sâu bệnh. Không bón trên đất mặn.', 'Act')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert sample phân bón');
  await sleep(2000);

  // ============================================================
  // PART 6: SAMPLE DATA - NGUỒN GỐC CÂY GIỐNG
  // ============================================================
  console.log('\n=== PART 6: Sample data - Nguồn gốc cây giống ===');
  await runSQL(`
    INSERT INTO nguon_goc_cay_giong (id, ten_giong, loai_cay, xuat_xu, nha_cung_cap, dia_chi_ncc, giay_chung_nhan, nam_cung_cap, chat_luong, ghi_chu, trang_thai) VALUES
    ('GG001', 'BV10 (Keo lai nuôi cấy mô)', 'Acacia hybrid', 'Viện Khoa học Lâm nghiệp VN (VAFS)', 'Trung tâm KHLN vùng Bắc Trung Bộ', 'Phủ Quỳ, Nghệ An', 'Giấy CN giống cây trồng lâm nghiệp số 01/CNGLNV', 2025, 'Tốt - Đạt TCVN 11570:2016', 'Giống quốc gia. MAI > 25 m³/ha/năm. Phù hợp vùng Bắc Trung Bộ.', 'Act'),
    ('GG002', 'BV16 (Keo lai nuôi cấy mô)', 'Acacia hybrid', 'Viện Khoa học Lâm nghiệp VN (VAFS)', 'Trung tâm Giống cây lâm nghiệp', 'Xuân Mai, Hà Nội', 'Giấy CN giống cây trồng lâm nghiệp', 2025, 'Tốt - Đạt TCVN 11570:2016', 'Giống quốc gia. Kháng bệnh tốt. Phù hợp vùng Bắc Bộ.', 'Act'),
    ('GG003', 'BV32 (Keo lai nuôi cấy mô)', 'Acacia hybrid', 'Viện Nghiên cứu Giống và CNSH Lâm nghiệp', 'Công ty TNHH Cây giống Hà Tĩnh', 'Đức Thọ, Hà Tĩnh', 'Giấy CN nguồn giống + Hóa đơn VAT', 2025, 'Tốt - Đạt TCVN 11570:2016', 'Giống tiến bộ kỹ thuật. Dạng thân đẹp, phù hợp gỗ lớn.', 'Act'),
    ('GG004', 'AH1 (Keo lai giâm hom)', 'Acacia hybrid', 'Vườn ươm địa phương', 'HTX Lâm nghiệp Quảng Trị', 'Cam Lộ, Quảng Trị', 'Phiếu kiểm nghiệm giống', 2025, 'Đạt - Kiểm tra ngoại quan', 'Giống hom từ cây đầu dòng đã được công nhận. Chi phí thấp.', 'Act'),
    ('GG005', 'AM (Keo tai tượng hạt)', 'Acacia mangium', 'Vườn giống chuyển hóa', 'Công ty Lâm nghiệp Bình Định', 'Quy Nhơn, Bình Định', 'Phiếu kiểm nghiệm hạt giống', 2025, 'Trung bình - Hạt giống lô nhỏ', 'Hạt giống từ vườn giống. Biến dị cao hơn nuôi cấy mô.', 'Act'),
    ('GG006', 'U6 (Bạch đàn urô)', 'Eucalyptus urophylla', 'VAFS', 'Trung tâm KHLN vùng Đông Bắc', 'Phú Thọ', 'Giấy CN giống cây trồng lâm nghiệp', 2025, 'Tốt', 'Giống quốc gia cho bạch đàn. Chịu lạnh, năng suất cao.', 'Act'),
    ('GG007', 'Thông ba lá (hạt nội)', 'Pinus kesiya', 'Rừng giống Lâm Đồng', 'BQL Rừng phòng hộ Lâm Đồng', 'Đà Lạt, Lâm Đồng', 'Phiếu kiểm nghiệm hạt', 2025, 'Tốt - Hạt chọn lọc', 'Hạt thu từ cây mẹ chọn lọc. Dùng trồng phục hồi rừng bản địa.', 'Act'),
    ('GG008', 'Sao đen (cây giống bầu)', 'Hopea odorata', 'Vườn ươm tỉnh Đồng Nai', 'Trung tâm Giống cây trồng Đồng Nai', 'Biên Hòa, Đồng Nai', 'Giấy xác nhận nguồn gốc', 2025, 'Tốt - Cây giống 12 tháng tuổi', 'Loài bản địa quý. Dùng trồng làm giàu rừng, phục hồi HCVF.', 'Act')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert sample nguồn gốc cây giống');
  await sleep(2000);

  // ============================================================
  // PART 7: SAMPLE PLAN DATA - 1 NĂM HOẠT ĐỘNG (2025)
  // ============================================================
  console.log('\n=== PART 7: Sample plan data - Year 2025 ===');

  // 7a. KH Trồng rừng 2025
  await runSQL(`
    INSERT INTO kh_trong_rung (id, id_nhom, nam, loai_cay, giong, dien_tich, mat_do, so_cay, thoi_diem_trong, phuong_phap, kinh_phi, nguon_giong, trang_thai, nguoi_lap, ghi_chu) VALUES
    ('KHTR-2025-001', 'NPHOT', 2025, 'Keo lai', 'BV10 nuôi cấy mô', 15.5, 1660, 25730, 'T2-T3/2025 (vụ Xuân)', 'Cuốc hố 30x30x30cm, bón lót NPK 200g/hố, trồng theo hàng', 155000000, 'TT Giống Nghệ An (GG001)', 'Đang thực hiện', 'Lộc Vũ Trung', 'Trồng mới trên đất trống sau khai thác. Lô: NPHOT khoảnh 1-3.'),
    ('KHTR-2025-002', 'NPHO2', 2025, 'Keo lai', 'BV32 nuôi cấy mô', 8.2, 1660, 13612, 'T9-T10/2025 (vụ Thu)', 'Cuốc hố máy, bón lót NPK + vi sinh Trichoderma', 82000000, 'Cty TNHH Cây giống Hà Tĩnh (GG003)', 'Kế hoạch', 'Lộc Vũ Trung', 'Trồng mới vụ Thu. Lô: NPHO2 khoảnh 5-6.'),
    ('KHTR-2025-003', 'NPLBI', 2025, 'Keo tai tượng + Lát hoa xen', 'AM hạt + Lát hoa bầu', 5.0, 1660, 8300, 'T2-T3/2025', 'Keo 1330 cây/ha + Lát hoa 330 cây/ha xen hàng', 65000000, 'Vườn giống Bình Định (GG005) + VƯ Đồng Nai', 'Đang thực hiện', 'Lộc Vũ Trung', 'Mô hình trồng xen loài bản địa theo FSC P10.2.')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert KH trồng rừng 2025');
  await sleep(1500);

  // 7b. KH Khai thác 2025
  await runSQL(`
    INSERT INTO kh_khai_thac (id, id_nhom, nam, loai_khai_thac, dien_tich, san_luong_du_kien, thoi_gian_bat_dau, thoi_gian_ket_thuc, phuong_phap, don_vi_khai_thac, kinh_phi, trang_thai, nguoi_lap, ghi_chu) VALUES
    ('KHKT-2025-001', 'NPHOT', 2025, 'Khai thác trắng (rừng trồng chu kỳ)', 12.3, 1845.0, '2025-01-15', '2025-03-30', 'Cưa xăng + Xe tải 7 tấn. RIL (Reduced Impact Logging)', 'Tổ khai thác nhóm Hợp Thành', 36900000, 'Hoàn thành', 'Lộc Vũ Trung', 'Rừng keo 7 tuổi. Sản lượng ~150 m³/ha. Bảng kê lâm sản đã lập.'),
    ('KHKT-2025-002', 'NPHO2', 2025, 'Khai thác trắng (rừng trồng chu kỳ)', 6.8, 1020.0, '2025-06-01', '2025-07-31', 'Cưa xăng + Máy kéo. Áp dụng kỹ thuật RIL', 'Tổ khai thác nhóm Hội Tiến', 20400000, 'Kế hoạch', 'Lộc Vũ Trung', 'Rừng keo 8 tuổi. Khai thác vụ Hè trước mùa mưa.'),
    ('KHKT-2025-003', 'NPLBI', 2025, 'Tỉa thưa lần 1', 3.5, 175.0, '2025-09-01', '2025-09-30', 'Tỉa thưa cơ giới, giữ lại 800 cây/ha', 'Tổ khai thác nhóm Lương Bình', 5250000, 'Kế hoạch', 'Lộc Vũ Trung', 'Rừng keo 4 tuổi. Tỉa thưa 50% để nuôi gỗ lớn (FSC P10.5).')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert KH khai thác 2025');
  await sleep(1500);

  // 7c. KH Tập huấn 2025
  await runSQL(`
    INSERT INTO kh_tap_huan (id, id_nhom, nam, ten_khoa, noi_dung, doi_tuong, so_nguoi_du_kien, thoi_gian_du_kien, dia_diem, giang_vien, kinh_phi, trang_thai, nguoi_lap, ghi_chu) VALUES
    ('KHTH-2025-001', 'NPHOT', 2025, 'Tập huấn EUDR & DDS cho nhóm hộ', 'Quy định EUDR EU 2023/1115; Yêu cầu DDS; Geolocation; Truy xuất nguồn gốc; Hồ sơ cần có', 'Thành viên nhóm + BQL nhóm', 25, 'T3/2025 (1 ngày)', 'UBND xã Hợp Thành', 'Lộc Vũ Trung - CleverForestry', 5000000, 'Hoàn thành', 'Lộc Vũ Trung', 'Tập huấn EUDR bắt buộc trước khi xuất gỗ sang EU.'),
    ('KHTH-2025-002', 'NPHOT', 2025, 'An toàn lao động trong khai thác rừng', 'Sử dụng cưa xăng an toàn; Bảo hộ lao động; Sơ cứu; Phòng cháy chữa cháy rừng', 'Công nhân khai thác + chủ rừng', 15, 'T1/2025 (1 ngày)', 'BQL nhóm Hợp Thành', 'Kiểm lâm huyện + BQL nhóm', 3000000, 'Hoàn thành', 'Lộc Vũ Trung', 'Tập huấn ATLĐ bắt buộc theo FSC P2.3 trước mùa khai thác.'),
    ('KHTH-2025-003', 'NPHO2', 2025, 'Kỹ thuật trồng rừng FSC & bón phân hợp lý', 'Kỹ thuật trồng keo; Bón phân đúng cách; Hạn chế hóa chất; Thuốc BVTV trong FSC', 'Chủ rừng nhóm Hội Tiến', 20, 'T8/2025 (1 ngày)', 'UBND xã Hội Tiến', 'Cán bộ kỹ thuật nhóm', 4000000, 'Kế hoạch', 'Lộc Vũ Trung', 'Tập huấn trước vụ trồng Thu 2025.'),
    ('KHTH-2025-004', 'NPLBI', 2025, 'Giám sát đa dạng sinh học & HCV', 'Nhận biết loài quý hiếm; Giám sát HCVF; Bẫy ảnh; GPS tracking tuần tra', 'BQL nhóm + Kiểm lâm địa bàn', 10, 'T5/2025 (2 ngày)', 'Rừng nhóm Lương Bình', 'Chuyên gia WWF', 8000000, 'Kế hoạch', 'Lộc Vũ Trung', 'Hỗ trợ nâng cao năng lực giám sát HCV cho FSC P9.')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert KH tập huấn 2025');
  await sleep(1500);

  // 7d. KH Cây giống 2025
  await runSQL(`
    INSERT INTO kh_cay_giong (id, id_nhom, nam, loai_cay, giong, so_luong_cay, nha_cung_cap, dia_chi_ncc, thoi_gian_cung_cap, yeu_cau_chat_luong, co_chung_nhan, kinh_phi, trang_thai, nguoi_lap, ghi_chu) VALUES
    ('KHCG-2025-001', 'NPHOT', 2025, 'Keo lai', 'BV10 nuôi cấy mô', 27000, 'TT KHLN vùng Bắc Trung Bộ', 'Phủ Quỳ, Nghệ An', 'T1/2025 - giao trước trồng 15 ngày', 'TCVN 11570:2016. Cây cao >25cm, D gốc >3mm, không sâu bệnh, rễ tốt', 'Có - Giấy CN giống QG', 40500000, 'Hoàn thành', 'Lộc Vũ Trung', 'Đủ cho 15.5ha + 5% dự phòng dặm. Kiểm tra chất lượng tại vườn ươm.'),
    ('KHCG-2025-002', 'NPHO2', 2025, 'Keo lai', 'BV32 nuôi cấy mô', 14500, 'Cty TNHH Cây giống Hà Tĩnh', 'Đức Thọ, Hà Tĩnh', 'T8/2025 - giao trước trồng Thu 15 ngày', 'TCVN 11570:2016. Cây mô đời F1, không GMO', 'Có - Giấy CN + Hóa đơn', 21750000, 'Kế hoạch', 'Lộc Vũ Trung', 'Đủ cho 8.2ha + 5% dặm. Kiểm tra nguồn gốc giống.'),
    ('KHCG-2025-003', 'NPLBI', 2025, 'Keo tai tượng + Lát hoa', 'AM hạt + Lát hoa bầu', 9000, 'Vườn giống Bình Định + VƯ Đồng Nai', 'Quy Nhơn + Biên Hòa', 'T1/2025', 'Keo: TCVN hạt giống. Lát hoa: cây bầu >30cm, 12 tháng tuổi', 'Có - Phiếu kiểm nghiệm', 18000000, 'Hoàn thành', 'Lộc Vũ Trung', 'Keo 6600 cây + Lát hoa 1650 cây + 10% dặm.')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert KH cây giống 2025');
  await sleep(1500);

  // 7e. KH Quản lý lô rừng 2025 (use existing table kh_ql_lo_rung)
  await runSQL(`
    INSERT INTO kh_ql_lo_rung (id, id_lo_rung, hoat_dong, ngay_thuc_hien, noi_dung, trang_thai, nguoi_nhap, ghi_chu) VALUES
    ('KHQL-2025-001', 'NPVHO.036.40-1-236', 'Chăm sóc rừng năm 2', '2025-04-15', 'Phát cỏ, bón thúc NPK 100g/gốc, kiểm tra sâu bệnh', 'Kế hoạch', 'Lộc Vũ Trung', 'Rừng keo lai 2 tuổi. Chăm sóc lần 2/năm.'),
    ('KHQL-2025-002', 'NPVHO.036.40-1-237', 'Phòng cháy chữa cháy rừng', '2025-05-01', 'Phát đường ranh cản lửa 5m, kiểm tra bảng cảnh báo, bổ sung dụng cụ PCCC', 'Kế hoạch', 'Lộc Vũ Trung', 'Trước mùa nắng nóng T5-T9.'),
    ('KHQL-2025-003', 'NPVHO.037.41-4-190', 'Giám sát hành lang ven suối', '2025-06-01', 'Kiểm tra vùng đệm ven suối 20m, đánh giá tình trạng thảm thực vật, chất lượng nước', 'Kế hoạch', 'Lộc Vũ Trung', 'Giám sát FSC P6.7. Lô giáp suối.'),
    ('KHQL-2025-004', 'NPVHO.036.40-1-236', 'Tỉa cành', '2025-07-01', 'Tỉa cành thấp dưới 1/3 chiều cao. Cải thiện chất lượng gỗ cho mục tiêu gỗ lớn', 'Kế hoạch', 'Lộc Vũ Trung', 'Áp dụng cho lô rừng nuôi gỗ lớn FSC.')
    ON CONFLICT (id) DO NOTHING;
  `, 'Insert KH QL lô rừng 2025');
  await sleep(1500);

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log('\n=== Verification ===');

  const menuCheck = await runSQL(`
    SELECT nhom, module, view_name FROM menu
    WHERE nhom = 'TÀI LIỆU THAM KHẢO'
    ORDER BY module;
  `, 'Check TÀI LIỆU THAM KHẢO menus');
  if (menuCheck) {
    console.log('TÀI LIỆU THAM KHẢO:');
    menuCheck.forEach(m => console.log('  ' + m.module + ' → ' + m.view_name));
  }

  const planTables = await runSQL(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('kh_trong_rung','kh_khai_thac','kh_tap_huan','kh_cay_giong')
    ORDER BY table_name;
  `, 'Check plan tables');
  if (planTables) console.log('Plan tables:', planTables.map(t => t.table_name).join(', '));

  const dataCounts = await runSQL(`
    SELECT 'cay_trong' as tbl, count(*) as cnt FROM danh_muc_cay_trong
    UNION ALL SELECT 'thuoc_bvtv', count(*) FROM danh_muc_thuoc_bvtv
    UNION ALL SELECT 'phan_bon', count(*) FROM danh_muc_phan_bon
    UNION ALL SELECT 'nguon_goc', count(*) FROM nguon_goc_cay_giong
    UNION ALL SELECT 'kh_trong_rung', count(*) FROM kh_trong_rung
    UNION ALL SELECT 'kh_khai_thac', count(*) FROM kh_khai_thac
    UNION ALL SELECT 'kh_tap_huan', count(*) FROM kh_tap_huan
    UNION ALL SELECT 'kh_cay_giong', count(*) FROM kh_cay_giong;
  `, 'Data counts');
  if (dataCounts) {
    console.log('Data counts:');
    dataCounts.forEach(r => console.log('  ' + r.tbl + ': ' + r.cnt));
  }

  console.log('\nDone! All restructuring complete.');
}

run().catch(err => console.error('Fatal:', err));
