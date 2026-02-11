-- ============================================================
-- FSCFM - Supabase Database Schema
-- He thong Quan ly Rung FSC
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_staff TEXT UNIQUE,
  ho_va_ten TEXT,
  email TEXT,
  gioi_tinh TEXT,
  ngay_sinh DATE,
  chuc_vu TEXT DEFAULT 'Thành viên',
  so_dien_thoai TEXT,
  trang_thai TEXT DEFAULT 'Pending',
  thuoc_ban_quan_ly TEXT,
  thuoc_nhom TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate id_staff on insert
CREATE OR REPLACE FUNCTION generate_staff_id()
RETURNS TRIGGER AS $$
DECLARE
  max_num INT;
  new_id TEXT;
BEGIN
  IF NEW.id_staff IS NULL OR NEW.id_staff = '' THEN
    SELECT COALESCE(MAX(
      CAST(NULLIF(regexp_replace(id_staff, '[^0-9]', '', 'g'), '') AS INT)
    ), 0) INTO max_num
    FROM profiles
    WHERE id_staff LIKE 'FSC_ST_%';

    new_id := 'FSC_ST_' || LPAD((max_num + 1)::TEXT, 3, '0');
    NEW.id_staff := new_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_staff_id
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_staff_id();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, ho_va_ten)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'ho_va_ten', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. MENU (permissions / navigation)
CREATE TABLE menu (
  id SERIAL PRIMARY KEY,
  nhom TEXT,
  module TEXT,
  view_name TEXT,
  xem TEXT DEFAULT '1',
  them TEXT DEFAULT '1',
  sua TEXT DEFAULT '1',
  xoa TEXT DEFAULT '1',
  phan_quyen TEXT
);

-- 3. ADMIN PROVINCE
CREATE TABLE admin_province (
  id SERIAL PRIMARY KEY,
  province_code TEXT,
  province TEXT,
  district TEXT,
  commune TEXT,
  type TEXT
);

-- 4. BAN QUAN LY NHOM (Management Boards)
CREATE TABLE ban_quan_ly_nhom (
  id TEXT PRIMARY KEY,
  ten TEXT,
  loai_to_chuc TEXT,
  dia_chi TEXT,
  tinh TEXT,
  huyen TEXT,
  nguoi_dai_dien TEXT,
  chuc_vu TEXT,
  dien_thoai TEXT,
  email TEXT,
  website TEXT,
  loai_cay_trong_chinh TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_ban_ql_updated
  BEFORE UPDATE ON ban_quan_ly_nhom
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. NHOM CCR (Certification Groups)
CREATE TABLE nhom_ccr (
  id TEXT PRIMARY KEY,
  id_ban_quan_ly TEXT REFERENCES ban_quan_ly_nhom(id) ON DELETE SET NULL,
  ma_nhom TEXT,
  ten_nhom TEXT,
  nguoi_dai_dien TEXT,
  so_dien_thoai TEXT,
  dia_chi TEXT,
  tinh TEXT,
  huyen TEXT,
  xa TEXT,
  xom TEXT,
  vi_tri TEXT,
  dien_tich_fsc NUMERIC(12,2) DEFAULT 0,
  dien_tich_ngoai_fsc NUMERIC(12,2) DEFAULT 0,
  dien_tich_rung_tu_nhien NUMERIC(12,2) DEFAULT 0,
  dien_tich_vung_dem NUMERIC(12,2) DEFAULT 0,
  tong_dien_tich NUMERIC(12,2) DEFAULT 0,
  san_luong_du_kien_nam NUMERIC(12,2) DEFAULT 0,
  dien_tich_trong_rung_nam NUMERIC(12,2) DEFAULT 0,
  so_thanh_vien INT DEFAULT 0,
  ngay_cap_nhat TIMESTAMPTZ DEFAULT now(),
  nguoi_cap_nhat TEXT,
  duong_dan_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_nhom_ccr_updated
  BEFORE UPDATE ON nhom_ccr
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. CHU RUNG (Forest Owners)
CREATE TABLE chu_rung (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  ho_ten TEXT,
  gioi_tinh TEXT,
  ngay_sinh DATE,
  dan_toc TEXT,
  cccd TEXT,
  ho_ten_vo TEXT,
  ho_ten_chong TEXT,
  so_dien_thoai TEXT,
  tinh TEXT,
  huyen TEXT,
  xa TEXT,
  thon TEXT,
  dia_chi TEXT,
  ngay_tham_gia DATE,
  ngay_roi_nhom DATE,
  so_lo_rung INT DEFAULT 0,
  tong_dien_tich NUMERIC(12,2) DEFAULT 0,
  dien_tich_fsc NUMERIC(12,2) DEFAULT 0,
  dien_tich_rung_tu_nhien NUMERIC(12,2) DEFAULT 0,
  dien_tich_vung_dem NUMERIC(12,2) DEFAULT 0,
  san_luong_du_kien_nam NUMERIC(12,2) DEFAULT 0,
  dien_tich_trong_rung_nam NUMERIC(12,2) DEFAULT 0,
  nguoi_nhap TEXT,
  duong_dan_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_chu_rung_updated
  BEFORE UPDATE ON chu_rung
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. LO RUNG (Forest Plots) - Full columns
CREATE TABLE lo_rung (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  ma_so_lo_2024 TEXT,
  ma_so_lo TEXT,
  qr_code TEXT,
  ten_lo_rung TEXT,
  -- Thong tin dia ly phap ly
  so_so_do TEXT,
  to_ban_do TEXT,
  thua_dat TEXT,
  tieu_khu TEXT,
  khoanh TEXT,
  toa_do_tam_lo TEXT,
  khoang_cach_toi_nha TEXT,
  dia_chi_lo TEXT,
  -- Phap ly
  tinh_trang_so_do TEXT,
  ngay_tham_gia_fsc DATE,
  tinh_trang_xoi_mon TEXT,
  nguyen_nhan_xoi_mon TEXT,
  moc_ranh_gioi TEXT,
  do_ben_vung_moc_ranh TEXT,
  trang_thai TEXT,
  -- Sinh thai
  do_doc_binh_quan TEXT,
  giap_ranh_rung_tu_nhien TEXT,
  co_loai_cay_ban_dia TEXT,
  ten_dong_vat_thuc_vat_quy TEXT,
  -- Cay trong
  loai_cay_trong_chinh TEXT,
  loai_cay_trong_xen_ghep TEXT,
  loai_cay_trong_fsc TEXT,
  nguon_goc_giong TEXT,
  mo_ta_nguon_goc_giong TEXT,
  co_hoa_don_giong TEXT,
  -- Mat do
  mat_do_ban_dau TEXT,
  mat_do_sau_tia_thua TEXT,
  so_cay_trong_chinh INT,
  so_cay_trong_dam INT,
  -- Dien tich
  tong_dien_tich NUMERIC(12,2) DEFAULT 0,
  dien_tich_gcn_qsdd NUMERIC(12,2) DEFAULT 0,
  dien_tich_trong_rung NUMERIC(12,2) DEFAULT 0,
  dien_tich_fsc NUMERIC(12,2) DEFAULT 0,
  dien_tich_ngoai_fsc NUMERIC(12,2) DEFAULT 0,
  dien_tich_vung_dem NUMERIC(12,2) DEFAULT 0,
  dien_tich_rung_tu_nhien NUMERIC(12,2) DEFAULT 0,
  dien_tich_hlvs NUMERIC(12,2) DEFAULT 0,
  co_ao_ho TEXT,
  -- Thoi gian
  thoi_diem_trong TEXT,
  nam_trong INT,
  so_nam_khai_thac INT,
  nam_khai_thac INT,
  san_luong_khai_thac_xe NUMERIC(12,2) DEFAULT 0,
  san_luong_khai_thac_dam NUMERIC(12,2) DEFAULT 0,
  -- Lao dong
  co_thue_lao_dong TEXT,
  phuong_tien_bao_ho TEXT,
  loai_phuong_tien_bhld TEXT,
  -- Ky thuat lam sinh
  ky_thuat_truoc_trong TEXT,
  ky_thuat_cham_soc TEXT,
  cuoc_ho_bang_may TEXT,
  bon_phan TEXT,
  loai_phan_bon TEXT,
  dinh_luong_phan_bon TEXT,
  kiem_soat_dich_benh TEXT,
  tinh_hinh_sau_benh TEXT,
  thuoc_su_dung TEXT,
  phong_chay_chua_chay TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_lo_rung_updated
  BEFORE UPDATE ON lo_rung
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. TAP HUAN (Training)
CREATE TABLE tap_huan (
  id TEXT PRIMARY KEY,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  loai_tap_huan TEXT,
  ngay_tap_huan DATE,
  dia_diem TEXT,
  giang_vien TEXT,
  so_luong_tham_du INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. NOI DUNG TAP HUAN
CREATE TABLE noi_dung_tap_huan (
  id TEXT PRIMARY KEY,
  ten_lop TEXT,
  loai_tap_huan TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. LOAI HOAT DONG RUNG (Activity Types)
CREATE TABLE loai_hoat_dong_rung (
  id TEXT PRIMARY KEY,
  ten_hoat_dong TEXT,
  mo_ta_chi_tiet TEXT
);

-- 11. KH QL LO RUNG (Plot Management Plans)
CREATE TABLE kh_ql_lo_rung (
  id TEXT PRIMARY KEY,
  id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
  hoat_dong TEXT,
  ngay_thuc_hien DATE,
  noi_dung TEXT,
  trang_thai TEXT,
  nguoi_nhap TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_kh_ql_updated
  BEFORE UPDATE ON kh_ql_lo_rung
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 12. BIEN DONG LO RUNG (Plot Changes)
CREATE TABLE bien_dong_lo_rung (
  id TEXT PRIMARY KEY,
  id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
  loai_bien_dong TEXT,
  ngay_bien_dong DATE,
  noi_dung TEXT,
  nguoi_nhap TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. KH HD NHOM (Group Activity Plans)
CREATE TABLE kh_hd_nhom (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  hoat_dong TEXT,
  ngay_thuc_hien DATE,
  noi_dung TEXT,
  trang_thai TEXT,
  nguoi_nhap TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. KH HD CHU RUNG (Owner Activity Plans)
CREATE TABLE kh_hd_chu_rung (
  id TEXT PRIMARY KEY,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  hoat_dong TEXT,
  ngay_thuc_hien DATE,
  noi_dung TEXT,
  trang_thai TEXT,
  nguoi_nhap TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. HD LO RUNG (Plot Activities/Reports)
CREATE TABLE hd_lo_rung (
  id TEXT PRIMARY KEY,
  id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
  id_hoat_dong TEXT,
  ten_hoat_dong TEXT,
  ngay_trien_khai DATE,
  ngay_ket_thuc DATE,
  ngay_bao_cao DATE,
  dia_diem_kiem_tra TEXT,
  nguoi_kiem_tra TEXT,
  ket_qua_hoat_dong TEXT,
  dien_tich_thuc_hien NUMERIC(12,2),
  so_lao_dong INT,
  tuoi_lao_dong TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_hd_lo_rung_updated
  BEFORE UPDATE ON hd_lo_rung
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 16. DS HDONG (Activity List)
CREATE TABLE ds_hdong (
  id TEXT PRIMARY KEY,
  hoat_dong_chi_tiet TEXT,
  nhom_hoat_dong TEXT
);

-- 17. CAU HOI DANH GIA (Audit Questions)
CREATE TABLE cau_hoi_danh_gia (
  id TEXT PRIMARY KEY,
  nhom_tieu_chi TEXT,
  noi_dung TEXT,
  phuong_phap TEXT,
  goi_y_bang_chung TEXT
);

-- 18. KET QUA DANH GIA (Audit Results)
CREATE TABLE ket_qua_danh_gia (
  id TEXT PRIMARY KEY,
  id_cau_hoi TEXT REFERENCES cau_hoi_danh_gia(id) ON DELETE SET NULL,
  id_dg TEXT,
  ket_qua TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. DG NOI BO (Internal Audits)
CREATE TABLE dg_noi_bo (
  id TEXT PRIMARY KEY,
  id_nhom TEXT,
  audit_date DATE,
  staff TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_dg_noi_bo_updated
  BEFORE UPDATE ON dg_noi_bo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 20. BANG HOI DG NOI BO (Audit Answers - wide table)
CREATE TABLE bang_hoi_dg_noi_bo (
  id TEXT PRIMARY KEY,
  id_dg TEXT REFERENCES dg_noi_bo(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_staff ON profiles(id_staff);
CREATE INDEX idx_nhom_ccr_ban ON nhom_ccr(id_ban_quan_ly);
CREATE INDEX idx_chu_rung_nhom ON chu_rung(id_nhom);
CREATE INDEX idx_lo_rung_chu ON lo_rung(id_chu_rung);
CREATE INDEX idx_lo_rung_nhom ON lo_rung(id_nhom);
CREATE INDEX idx_kh_ql_lo ON kh_ql_lo_rung(id_lo_rung);
CREATE INDEX idx_hd_lo ON hd_lo_rung(id_lo_rung);
CREATE INDEX idx_tap_huan_chu ON tap_huan(id_chu_rung);
CREATE INDEX idx_dg_noi_bo_nhom ON dg_noi_bo(id_nhom);
CREATE INDEX idx_bang_hoi_dg ON bang_hoi_dg_noi_bo(id_dg);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fscfm-uploads', 'fscfm-uploads', true)
ON CONFLICT (id) DO NOTHING;
