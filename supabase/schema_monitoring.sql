-- ============================================================
-- FSCFM - Monitoring Module Schema
-- Giám sát & Đánh giá lô rừng
-- ============================================================

-- 21. GIAM SAT LO RUNG (Forest Plot Monitoring Sessions)
CREATE TABLE IF NOT EXISTS giam_sat_lo_rung (
  id TEXT PRIMARY KEY,
  id_lo_rung TEXT REFERENCES lo_rung(id) ON DELETE SET NULL,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  id_chu_rung TEXT REFERENCES chu_rung(id) ON DELETE SET NULL,
  loai_giam_sat TEXT NOT NULL,
  -- Types: giam_sat_nhom, trong_rung, trong_khai_thac, truoc_khai_thac, sau_khai_thac, bao_ve_rung, hanh_lang_ven_suoi
  ngay_giam_sat DATE,
  nguoi_giam_sat TEXT,
  dai_dien_to TEXT,
  dien_tich_giam_sat NUMERIC(12,2),
  thoi_tiet TEXT,
  ghi_chu TEXT,
  de_xuat TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_giam_sat_updated
  BEFORE UPDATE ON giam_sat_lo_rung
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 22. BANG HOI GIAM SAT (Monitoring Answers - JSONB pattern)
CREATE TABLE IF NOT EXISTS bang_hoi_giam_sat (
  id TEXT PRIMARY KEY,
  id_giam_sat TEXT REFERENCES giam_sat_lo_rung(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. KH GIAM SAT NHOM (Group Monitoring Plan / Schedule)
CREATE TABLE IF NOT EXISTS kh_giam_sat_nhom (
  id TEXT PRIMARY KEY,
  id_nhom TEXT REFERENCES nhom_ccr(id) ON DELETE SET NULL,
  nam INT,
  loai_giam_sat TEXT,
  thang_1 TEXT DEFAULT '',
  thang_2 TEXT DEFAULT '',
  thang_3 TEXT DEFAULT '',
  thang_4 TEXT DEFAULT '',
  thang_5 TEXT DEFAULT '',
  thang_6 TEXT DEFAULT '',
  thang_7 TEXT DEFAULT '',
  thang_8 TEXT DEFAULT '',
  thang_9 TEXT DEFAULT '',
  thang_10 TEXT DEFAULT '',
  thang_11 TEXT DEFAULT '',
  thang_12 TEXT DEFAULT '',
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_kh_giam_sat_updated
  BEFORE UPDATE ON kh_giam_sat_nhom
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_giam_sat_lo ON giam_sat_lo_rung(id_lo_rung);
CREATE INDEX IF NOT EXISTS idx_giam_sat_nhom ON giam_sat_lo_rung(id_nhom);
CREATE INDEX IF NOT EXISTS idx_giam_sat_loai ON giam_sat_lo_rung(loai_giam_sat);
CREATE INDEX IF NOT EXISTS idx_bang_hoi_gs ON bang_hoi_giam_sat(id_giam_sat);
CREATE INDEX IF NOT EXISTS idx_kh_gs_nhom ON kh_giam_sat_nhom(id_nhom);

-- Add monitoring menu items
INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
  ('4. Đánh giá', 'Giám sát lô rừng', 'GiamSat_LoRung', '1', '1', '1', '1', '')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE giam_sat_lo_rung ENABLE ROW LEVEL SECURITY;
ALTER TABLE bang_hoi_giam_sat ENABLE ROW LEVEL SECURITY;
ALTER TABLE kh_giam_sat_nhom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON giam_sat_lo_rung FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON bang_hoi_giam_sat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON kh_giam_sat_nhom FOR ALL TO authenticated USING (true) WITH CHECK (true);
