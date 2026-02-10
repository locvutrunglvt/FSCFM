-- ============================================================
-- FSCFM - Row Level Security Policies
-- ============================================================

-- Helper function: Check if current user is Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND lower(chuc_vu) LIKE '%admin%'
    AND trang_thai = 'Act'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user's profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- MENU
-- ============================================================
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_select" ON menu
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "menu_admin" ON menu
  FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- ADMIN PROVINCE
-- ============================================================
ALTER TABLE admin_province ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_province_select" ON admin_province
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_province_admin" ON admin_province
  FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- BAN QUAN LY NHOM
-- ============================================================
ALTER TABLE ban_quan_ly_nhom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ban_ql_select" ON ban_quan_ly_nhom
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ban_ql_insert" ON ban_quan_ly_nhom
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "ban_ql_update" ON ban_quan_ly_nhom
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "ban_ql_delete" ON ban_quan_ly_nhom
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- NHOM CCR
-- ============================================================
ALTER TABLE nhom_ccr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nhom_ccr_select" ON nhom_ccr
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "nhom_ccr_insert" ON nhom_ccr
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "nhom_ccr_update" ON nhom_ccr
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "nhom_ccr_delete" ON nhom_ccr
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- CHU RUNG
-- ============================================================
ALTER TABLE chu_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chu_rung_select" ON chu_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "chu_rung_insert" ON chu_rung
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "chu_rung_update" ON chu_rung
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "chu_rung_delete" ON chu_rung
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- LO RUNG
-- ============================================================
ALTER TABLE lo_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lo_rung_select" ON lo_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lo_rung_insert" ON lo_rung
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "lo_rung_update" ON lo_rung
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "lo_rung_delete" ON lo_rung
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- TAP HUAN
-- ============================================================
ALTER TABLE tap_huan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tap_huan_select" ON tap_huan
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tap_huan_modify" ON tap_huan
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- NOI DUNG TAP HUAN
-- ============================================================
ALTER TABLE noi_dung_tap_huan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ndth_select" ON noi_dung_tap_huan
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ndth_modify" ON noi_dung_tap_huan
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- LOAI HOAT DONG RUNG
-- ============================================================
ALTER TABLE loai_hoat_dong_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lhdr_select" ON loai_hoat_dong_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lhdr_modify" ON loai_hoat_dong_rung
  FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- KH QL LO RUNG
-- ============================================================
ALTER TABLE kh_ql_lo_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khql_select" ON kh_ql_lo_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "khql_modify" ON kh_ql_lo_rung
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- BIEN DONG LO RUNG
-- ============================================================
ALTER TABLE bien_dong_lo_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bdlr_select" ON bien_dong_lo_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bdlr_modify" ON bien_dong_lo_rung
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- KH HD NHOM
-- ============================================================
ALTER TABLE kh_hd_nhom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khhn_select" ON kh_hd_nhom
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "khhn_modify" ON kh_hd_nhom
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- KH HD CHU RUNG
-- ============================================================
ALTER TABLE kh_hd_chu_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khhcr_select" ON kh_hd_chu_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "khhcr_modify" ON kh_hd_chu_rung
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- HD LO RUNG
-- ============================================================
ALTER TABLE hd_lo_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hdlr_select" ON hd_lo_rung
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hdlr_modify" ON hd_lo_rung
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- DS HDONG
-- ============================================================
ALTER TABLE ds_hdong ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dshd_select" ON ds_hdong
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dshd_modify" ON ds_hdong
  FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- CAU HOI DANH GIA
-- ============================================================
ALTER TABLE cau_hoi_danh_gia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chdg_select" ON cau_hoi_danh_gia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "chdg_modify" ON cau_hoi_danh_gia
  FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- KET QUA DANH GIA
-- ============================================================
ALTER TABLE ket_qua_danh_gia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kqdg_select" ON ket_qua_danh_gia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kqdg_modify" ON ket_qua_danh_gia
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- DG NOI BO
-- ============================================================
ALTER TABLE dg_noi_bo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dgnb_select" ON dg_noi_bo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dgnb_modify" ON dg_noi_bo
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- BANG HOI DG NOI BO
-- ============================================================
ALTER TABLE bang_hoi_dg_noi_bo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bhdg_select" ON bang_hoi_dg_noi_bo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bhdg_modify" ON bang_hoi_dg_noi_bo
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- STORAGE: fscfm-uploads bucket policies
-- ============================================================
CREATE POLICY "storage_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fscfm-uploads');

CREATE POLICY "storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fscfm-uploads');

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fscfm-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
