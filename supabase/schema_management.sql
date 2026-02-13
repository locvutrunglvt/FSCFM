-- ============================================================
-- FSCFM - Management Board Module Schema
-- Quản lý Ban: Tập huấn, Khiếu nại, Tài sản, Dụng cụ lao động
-- Author: Lộc Vũ Trung - CleverForestry Consulting
-- ============================================================

-- 1. LỚP TẬP HUẤN (Training Classes - at nhóm level)
CREATE TABLE IF NOT EXISTS lop_tap_huan (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  ten_lop TEXT,
  noi_dung TEXT,
  giang_vien TEXT,
  dia_diem TEXT,
  ngay_bat_dau DATE,
  ngay_ket_thuc DATE,
  so_buoi INT DEFAULT 0,
  so_nguoi_tham_gia INT DEFAULT 0,
  kinh_phi NUMERIC(15,2) DEFAULT 0,
  ket_qua TEXT,
  tai_lieu TEXT,
  nam INT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_lop_tap_huan_updated
  BEFORE UPDATE ON lop_tap_huan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. DANH SÁCH HỌC VIÊN (Training Participants)
CREATE TABLE IF NOT EXISTS ds_hoc_vien (
  id TEXT PRIMARY KEY,
  id_lop_tap_huan TEXT REFERENCES lop_tap_huan(id) ON DELETE CASCADE,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  ho_ten TEXT,
  gioi_tinh TEXT,
  danh_gia TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. KHIẾU NẠI (Complaints)
CREATE TABLE IF NOT EXISTS khieu_nai (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  nguoi_khieu_nai TEXT,
  dia_chi TEXT,
  dien_thoai TEXT,
  email TEXT,
  ngay_tiep_nhan DATE,
  noi_dung TEXT,
  phan_loai TEXT,
  muc_do TEXT,
  nguoi_xu_ly TEXT,
  ngay_xu_ly DATE,
  bien_phap TEXT,
  ket_qua TEXT,
  trang_thai TEXT DEFAULT 'Chưa xử lý',
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_khieu_nai_updated
  BEFORE UPDATE ON khieu_nai
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. TÀI SẢN (Assets)
CREATE TABLE IF NOT EXISTS tai_san (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  ten_tai_san TEXT,
  loai_tai_san TEXT,
  so_luong INT DEFAULT 0,
  don_vi TEXT,
  gia_tri NUMERIC(15,2) DEFAULT 0,
  ngay_mua DATE,
  nguon_goc TEXT,
  tinh_trang TEXT,
  vi_tri_luu_tru TEXT,
  nguoi_quan_ly TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_tai_san_updated
  BEFORE UPDATE ON tai_san
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. DỤNG CỤ LAO ĐỘNG (Tools/Equipment)
CREATE TABLE IF NOT EXISTS dung_cu_lao_dong (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  ten_dung_cu TEXT,
  loai_dung_cu TEXT,
  so_luong_tong INT DEFAULT 0,
  so_luong_con_lai INT DEFAULT 0,
  don_vi TEXT,
  tinh_trang TEXT,
  vi_tri_luu_tru TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_dung_cu_updated
  BEFORE UPDATE ON dung_cu_lao_dong
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. MƯỢN TRẢ DỤNG CỤ (Tool Lending/Return)
CREATE TABLE IF NOT EXISTS muon_tra_dung_cu (
  id TEXT PRIMARY KEY,
  id_dung_cu TEXT REFERENCES dung_cu_lao_dong(id) ON DELETE CASCADE,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  nguoi_muon TEXT,
  so_luong_muon INT DEFAULT 0,
  ngay_muon DATE,
  ngay_hen_tra DATE,
  ngay_tra_thuc_te DATE,
  tinh_trang_tra TEXT,
  trang_thai TEXT DEFAULT 'Đang mượn',
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_muon_tra_updated
  BEFORE UPDATE ON muon_tra_dung_cu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- AUTO-UPDATE QUANTITY TRIGGER: khi mượn/trả tự động cập nhật số lượng còn lại
CREATE OR REPLACE FUNCTION update_dung_cu_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE dung_cu_lao_dong
    SET so_luong_con_lai = GREATEST(0, so_luong_con_lai - NEW.so_luong_muon)
    WHERE id = NEW.id_dung_cu;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.trang_thai = 'Đã trả' AND OLD.trang_thai != 'Đã trả' THEN
      UPDATE dung_cu_lao_dong
      SET so_luong_con_lai = so_luong_con_lai + NEW.so_luong_muon
      WHERE id = NEW.id_dung_cu;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.trang_thai != 'Đã trả' THEN
      UPDATE dung_cu_lao_dong
      SET so_luong_con_lai = so_luong_con_lai + OLD.so_luong_muon
      WHERE id = OLD.id_dung_cu;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_muon_tra_quantity
  AFTER INSERT OR UPDATE OR DELETE ON muon_tra_dung_cu
  FOR EACH ROW EXECUTE FUNCTION update_dung_cu_quantity();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_lop_th_nhom ON lop_tap_huan(id_nhom);
CREATE INDEX IF NOT EXISTS idx_lop_th_nam ON lop_tap_huan(nam);
CREATE INDEX IF NOT EXISTS idx_ds_hv_lop ON ds_hoc_vien(id_lop_tap_huan);
CREATE INDEX IF NOT EXISTS idx_ds_hv_cr ON ds_hoc_vien(id_chu_rung);
CREATE INDEX IF NOT EXISTS idx_khieu_nai_nhom ON khieu_nai(id_nhom);
CREATE INDEX IF NOT EXISTS idx_khieu_nai_tt ON khieu_nai(trang_thai);
CREATE INDEX IF NOT EXISTS idx_tai_san_nhom ON tai_san(id_nhom);
CREATE INDEX IF NOT EXISTS idx_dung_cu_nhom ON dung_cu_lao_dong(id_nhom);
CREATE INDEX IF NOT EXISTS idx_muon_tra_dc ON muon_tra_dung_cu(id_dung_cu);
CREATE INDEX IF NOT EXISTS idx_muon_tra_cr ON muon_tra_dung_cu(id_chu_rung);
CREATE INDEX IF NOT EXISTS idx_muon_tra_tt ON muon_tra_dung_cu(trang_thai);

-- MENU ITEMS (thêm vào nhóm "Quản lý tổ chức")
INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
  ('1. Quản lý tổ chức', 'Lớp tập huấn', 'Lop_Taphuan', '1', '1', '1', '1', ''),
  ('1. Quản lý tổ chức', 'Khiếu nại', 'Khieu_Nai', '1', '1', '1', '1', ''),
  ('1. Quản lý tổ chức', 'Tài sản', 'Tai_San', '1', '1', '1', '1', ''),
  ('1. Quản lý tổ chức', 'Dụng cụ lao động', 'Dung_Cu', '1', '1', '1', '1', '')
ON CONFLICT DO NOTHING;

-- RLS POLICIES
ALTER TABLE lop_tap_huan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_hoc_vien ENABLE ROW LEVEL SECURITY;
ALTER TABLE khieu_nai ENABLE ROW LEVEL SECURITY;
ALTER TABLE tai_san ENABLE ROW LEVEL SECURITY;
ALTER TABLE dung_cu_lao_dong ENABLE ROW LEVEL SECURITY;
ALTER TABLE muon_tra_dung_cu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON lop_tap_huan
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON ds_hoc_vien
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON khieu_nai
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON tai_san
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON dung_cu_lao_dong
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON muon_tra_dung_cu
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
