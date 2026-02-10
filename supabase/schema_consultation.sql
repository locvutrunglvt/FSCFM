-- ============================================================
-- STAKEHOLDER CONSULTATION MODULE
-- ============================================================

-- 24. BEN LIEN QUAN (Stakeholder Organizations)
CREATE TABLE IF NOT EXISTS ben_lien_quan (
  id TEXT PRIMARY KEY,
  ten_to_chuc TEXT,
  email TEXT,
  dia_chi TEXT,
  dien_thoai TEXT,
  nguoi_dai_dien TEXT,
  website TEXT,
  nhom_blq TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. DOT THAM VAN (Consultation Sessions)
CREATE TABLE IF NOT EXISTS dot_tham_van (
  id TEXT PRIMARY KEY,
  ten_dot TEXT,
  nam INTEGER,
  noi_dung_gioi_thieu TEXT,
  trang_thai TEXT DEFAULT 'Đang mở',
  nguoi_tao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 26. PHAN HOI THAM VAN (Consultation Responses)
CREATE TABLE IF NOT EXISTS phan_hoi_tham_van (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  id_dot TEXT REFERENCES dot_tham_van(id) ON DELETE CASCADE,
  id_ben_lien_quan TEXT,
  nguoi_tra_loi TEXT,
  dia_chi TEXT,
  dien_thoai TEXT,
  ngay_phan_hoi DATE DEFAULT CURRENT_DATE,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_phan_hoi_dot ON phan_hoi_tham_van(id_dot);
CREATE INDEX IF NOT EXISTS idx_phan_hoi_blq ON phan_hoi_tham_van(id_ben_lien_quan);
CREATE INDEX IF NOT EXISTS idx_blq_email ON ben_lien_quan(email);

-- RLS
ALTER TABLE ben_lien_quan ENABLE ROW LEVEL SECURITY;
ALTER TABLE dot_tham_van ENABLE ROW LEVEL SECURITY;
ALTER TABLE phan_hoi_tham_van ENABLE ROW LEVEL SECURITY;

-- ben_lien_quan: Authenticated full access
CREATE POLICY "blq_select" ON ben_lien_quan FOR SELECT TO authenticated USING (true);
CREATE POLICY "blq_insert" ON ben_lien_quan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blq_update" ON ben_lien_quan FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "blq_delete" ON ben_lien_quan FOR DELETE TO authenticated USING (true);

-- dot_tham_van: Authenticated full access + Anon SELECT (for public form to verify session)
CREATE POLICY "dtv_auth_select" ON dot_tham_van FOR SELECT TO authenticated USING (true);
CREATE POLICY "dtv_auth_insert" ON dot_tham_van FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dtv_auth_update" ON dot_tham_van FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dtv_auth_delete" ON dot_tham_van FOR DELETE TO authenticated USING (true);
CREATE POLICY "dtv_anon_select" ON dot_tham_van FOR SELECT TO anon USING (true);

-- phan_hoi_tham_van: Authenticated full access + Anon INSERT (for public form)
CREATE POLICY "phtv_auth_select" ON phan_hoi_tham_van FOR SELECT TO authenticated USING (true);
CREATE POLICY "phtv_auth_insert" ON phan_hoi_tham_van FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "phtv_auth_update" ON phan_hoi_tham_van FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phtv_auth_delete" ON phan_hoi_tham_van FOR DELETE TO authenticated USING (true);
CREATE POLICY "phtv_anon_insert" ON phan_hoi_tham_van FOR INSERT TO anon WITH CHECK (true);
