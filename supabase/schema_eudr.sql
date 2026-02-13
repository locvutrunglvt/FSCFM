-- ============================================================
-- FSCFM - EUDR Compliance Module Schema
-- Tuân thủ EUDR: Đánh giá, Bảng hỏi, Báo cáo
-- Author: Lộc Vũ Trung - CleverForestry Consulting
-- ============================================================

-- 1. ĐỢT ĐÁNH GIÁ EUDR (EUDR Assessment Sessions)
CREATE TABLE IF NOT EXISTS dot_dg_eudr (
  id TEXT PRIMARY KEY,
  id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  ngay_danh_gia DATE,
  nguoi_danh_gia TEXT,
  diem_so INT DEFAULT 0,
  trang_thai TEXT DEFAULT 'Mới',
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_dot_dg_eudr_updated
  BEFORE UPDATE ON dot_dg_eudr
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. BẢNG HỎI EUDR (EUDR Questionnaire Answers - JSONB)
CREATE TABLE IF NOT EXISTS bang_hoi_eudr (
  id TEXT PRIMARY KEY,
  id_dg TEXT REFERENCES dot_dg_eudr(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_lorung ON dot_dg_eudr(id_lo_rung);
CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_nhom ON dot_dg_eudr(id_nhom);
CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_churung ON dot_dg_eudr(id_chu_rung);
CREATE INDEX IF NOT EXISTS idx_dot_dg_eudr_ngay ON dot_dg_eudr(ngay_danh_gia);
CREATE INDEX IF NOT EXISTS idx_bang_hoi_eudr_dg ON bang_hoi_eudr(id_dg);

-- RLS POLICIES
ALTER TABLE dot_dg_eudr ENABLE ROW LEVEL SECURITY;
ALTER TABLE bang_hoi_eudr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON dot_dg_eudr
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON bang_hoi_eudr
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MENU ITEMS (thêm vào nhóm "QUẢN LÝ RỪNG BỀN VỮNG")
INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
  ('QUẢN LÝ RỪNG BỀN VỮNG', 'Tài liệu tham khảo EUDR', 'EUDR_TaiLieu', '1', '0', '0', '0', ''),
  ('QUẢN LÝ RỪNG BỀN VỮNG', 'Đánh giá tuân thủ EUDR', 'EUDR_DanhGia', '1', '1', '1', '1', ''),
  ('QUẢN LÝ RỪNG BỀN VỮNG', 'Báo cáo tuân thủ EUDR', 'EUDR_BaoCao', '1', '0', '0', '0', '')
ON CONFLICT DO NOTHING;
