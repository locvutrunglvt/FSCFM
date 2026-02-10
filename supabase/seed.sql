-- ============================================================
-- FSCFM - Seed Data
-- ============================================================

-- MENU (Navigation + Permissions)
INSERT INTO menu (nhom, module, view_name, xem, them, sua, xoa, phan_quyen) VALUES
  ('1. Quản lý tổ chức', 'Ban Quản lý nhóm', 'Ban_Quanly', '1', '1', '1', '1', ''),
  ('1. Quản lý tổ chức', 'Nhóm CCR', 'DS_NhomCCR', '1', '1', '1', '1', ''),
  ('1. Quản lý tổ chức', 'Chủ rừng', 'Churung', '1', '1', '1', '1', ''),
  ('2. Quản lý rừng', 'Lô rừng', 'Lo_rung', '1', '1', '1', '1', ''),
  ('2. Quản lý rừng', 'Biến động lô rừng', 'Biendong', '1', '1', '1', '1', ''),
  ('3. Hoạt động', 'Tập huấn', 'Taphuan', '1', '1', '1', '1', ''),
  ('3. Hoạt động', 'Nội dung tập huấn', 'Noidung_taphuan', '1', '1', '1', '0', ''),
  ('3. Hoạt động', 'Loại hoạt động rừng', 'Loai_hoatdong_rung', '1', '1', '1', '0', ''),
  ('4. Đánh giá', 'Đánh giá nội bộ', 'DG_noibo', '1', '1', '1', '1', ''),
  ('5. Hệ thống', 'Nhân sự', 'Nhan_Su', '1', '1', '1', '1', 'admin'),
  ('5. Hệ thống', 'Quản lý Menu', 'Menu', '1', '1', '1', '1', 'admin'),
  ('5. Hệ thống', 'Dữ liệu Tỉnh/Huyện', 'Admin_Province', '1', '0', '0', '0', 'admin');

-- CAU HOI DANH GIA (Audit Questions from AUDIT_DICTIONARY)
INSERT INTO cau_hoi_danh_gia (id, nhom_tieu_chi, noi_dung, phuong_phap, goi_y_bang_chung) VALUES
  -- TUAN THU PHAP LUAT
  ('RanhGioiRoRang', 'TUÂN THỦ PHÁP LUẬT', 'Ranh giới của tất cả các Đơn vị Quản lý trong phạm vi chứng chỉ có được xác định hoặc tài liệu hóa rõ ràng và thể hiện rõ trên bản đồ không?', 'Kiểm tra tài liệu, bản đồ', 'Bản đồ ranh giới, sổ đỏ'),
  ('NopThuePhiDayDu', 'TUÂN THỦ PHÁP LUẬT', 'Việc chi trả các loại thuế và phí liên quan đến quản lý rừng có được thực hiện kịp thời theo đúng quy định hiện hành không?', 'Kiểm tra hóa đơn, biên lai', 'Biên lai thuế, phí'),
  ('GiamSatNoiBo', 'TUÂN THỦ PHÁP LUẬT', 'Công tác giám sát nội bộ hoạt động nhóm có được thực hiện không?', 'Phỏng vấn, kiểm tra hồ sơ', 'Biên bản giám sát'),
  ('XuLyViPham', 'TUÂN THỦ PHÁP LUẬT', 'Nếu phát hiện các hoạt động trái phép hoặc bất hợp pháp, chủ rừng có thực thi các biện pháp để giải quyết các vấn đề không?', 'Phỏng vấn', 'Biên bản xử lý vi phạm'),
  ('GiaiQuyetTranhChapNgoaiToa', 'TUÂN THỦ PHÁP LUẬT', 'Các tranh chấp liên quan đến pháp luật và quyền truyền thống có được giải quyết kịp thời ngoài tòa án không?', 'Phỏng vấn, kiểm tra hồ sơ', 'Biên bản hòa giải'),
  ('HoSoTranhChap', 'TUÂN THỦ PHÁP LUẬT', 'Hồ sơ tranh chấp có được cập nhật đầy đủ các bước giải quyết, kết quả, hoặc lý do chưa giải quyết xong không?', 'Kiểm tra hồ sơ', 'Hồ sơ tranh chấp'),
  ('NgungHoatDongKhiTranhChap', 'TUÂN THỦ PHÁP LUẬT', 'Chủ rừng có ngừng hoạt động ở các nơi có tranh chấp nghiêm trọng, kéo dài hoặc liên quan đến nhiều bên không?', 'Phỏng vấn', 'Biên bản ngừng hoạt động'),

  -- QUYEN NGUOI LAO DONG
  ('TuDoThamGiaToChuc', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Người lao động có được tự do tham gia tổ chức lao động mà họ lựa chọn không?', 'Phỏng vấn người lao động', 'Xác nhận của NLĐ'),
  ('KhongLaoDongCuongBuc', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Có tồn tại bất cứ hình thức lao động cưỡng bức nào đối với người lao động của chủ rừng và nhà thầu không?', 'Phỏng vấn, quan sát', 'Hợp đồng lao động'),
  ('TraLuongCongBang', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Phụ nữ và nam giới có được trả lương công bằng khi làm cùng một công việc không?', 'Kiểm tra bảng lương', 'Bảng chấm công, bảng lương'),
  ('PhuongThucTraLuongNu', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Phụ nữ có được trả lương trực tiếp và sử dụng các phương thức an toàn không?', 'Phỏng vấn', 'Chứng từ thanh toán'),
  ('NghiThaiSan', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Phụ nữ có được nghỉ thai sản theo quy định của luật bảo hiểm xã hội không?', 'Kiểm tra hồ sơ', 'Đơn xin nghỉ, giấy xác nhận'),
  ('TrangBiBaoHo', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Người lao động có được trang bị đầy đủ thiết bị bảo hộ cá nhân phù hợp không?', 'Quan sát thực tế', 'Ảnh chụp, biên bản phát BHLD'),
  ('BatBuocDungBaoHo', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Việc sử dụng thiết bị bảo hộ cá nhân có phải là yêu cầu bắt buộc không?', 'Kiểm tra quy định', 'Nội quy lao động'),
  ('HoSoAnToanLaoDong', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Hồ sơ về an toàn lao động có được lưu giữ không?', 'Kiểm tra hồ sơ', 'Sổ theo dõi ATLĐ'),
  ('CaiThienAnToanSauSuCo', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Công tác an toàn lao động có được cải thiện sau các sự cố không?', 'Phỏng vấn', 'Biên bản khắc phục'),
  ('MucLuongToiThieu', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Mức lương chi trả có bằng hoặc cao hơn mức lương tối thiểu vùng không?', 'Kiểm tra bảng lương', 'Bảng lương, quy định vùng'),
  ('TraLuongDungHan', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Tiền lương có được chi trả kịp thời và đúng thỏa thuận không?', 'Phỏng vấn NLĐ', 'Phiếu lương, chứng từ'),
  ('DaoTaoNguoiLaoDong', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Người lao động có được đào tạo công việc cụ thể không?', 'Kiểm tra hồ sơ đào tạo', 'Giấy chứng nhận đào tạo'),
  ('HoSoDaoTao', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Hồ sơ đào tạo có được lưu giữ không?', 'Kiểm tra hồ sơ', 'Sổ theo dõi đào tạo'),
  ('GiaiQuyetKhieuNai', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Các khiếu nại của người lao động có được giải quyết thỏa đáng không?', 'Phỏng vấn', 'Biên bản giải quyết'),
  ('BoiThuongThietHai', 'QUYỀN NGƯỜI LAO ĐỘNG', 'Người lao động có được bồi thường cho các thiệt hại liên quan đến công việc không?', 'Kiểm tra hồ sơ', 'Biên bản bồi thường'),

  -- QUYEN NGUOI BAN DIA
  ('NhanDienNguoiBanDia', 'QUYỀN NGƯỜI BẢN ĐỊA', 'Có xác định được Người dân tộc bị ảnh hưởng bởi hoạt động quản lý rừng không?', 'Phỏng vấn, kiểm tra', 'Danh sách DTTS'),
  ('TaiLieuHoaQuyenLoi', 'QUYỀN NGƯỜI BẢN ĐỊA', 'Các quyền lợi của người dân tộc có được tài liệu hóa không?', 'Kiểm tra tài liệu', 'Bản đồ, văn bản'),
  ('ThamVanNguoiBanDia', 'QUYỀN NGƯỜI BẢN ĐỊA', 'Người dân tộc có được tham vấn về hoạt động quản lý rừng không?', 'Phỏng vấn', 'Biên bản họp'),
  ('HoSoThoaThuan', 'QUYỀN NGƯỜI BẢN ĐỊA', 'Hồ sơ thỏa thuận với người dân tộc có được lưu giữ không?', 'Kiểm tra hồ sơ', 'Văn bản thỏa thuận'),
  ('BaoVeDiaDiemVanHoa', 'QUYỀN NGƯỜI BẢN ĐỊA', 'Các địa điểm văn hóa, tâm linh có được bảo vệ không?', 'Quan sát thực tế', 'Bản đồ vị trí văn hóa'),

  -- QUAN HE CONG DONG
  ('NhanDienCongDong', 'QUAN HỆ CỘNG ĐỒNG', 'Có xác định được cộng đồng địa phương bên trong và xung quanh Đơn vị Quản lý không?', 'Phỏng vấn', 'Danh sách cộng đồng'),
  ('ThamVanCongDong', 'QUAN HỆ CỘNG ĐỒNG', 'Cộng đồng địa phương có được tham vấn về hoạt động quản lý rừng không?', 'Phỏng vấn', 'Biên bản họp dân'),
  ('BaoVeQuyenLoiCongDong', 'QUAN HỆ CỘNG ĐỒNG', 'Các quyền của cộng đồng địa phương có được tôn trọng không?', 'Phỏng vấn', 'Biên bản cam kết'),
  ('GiaiQuyetXamPhamQuyenLoi', 'QUAN HỆ CỘNG ĐỒNG', 'Nếu có vi phạm quyền lợi cộng đồng, có được giải quyết thỏa đáng không?', 'Kiểm tra hồ sơ', 'Biên bản giải quyết'),
  ('QuyTrinhGiaiQuyetTranhChap', 'QUAN HỆ CỘNG ĐỒNG', 'Có quy trình giải quyết tranh chấp công khai không?', 'Kiểm tra tài liệu', 'Quy trình văn bản'),
  ('XuLyTranhChapCongDong', 'QUAN HỆ CỘNG ĐỒNG', 'Các tranh chấp liên quan đến quản lý rừng có được giải quyết kịp thời không?', 'Phỏng vấn', 'Hồ sơ tranh chấp'),

  -- LOI ICH TU RUNG
  ('CanCuKhaiThac', 'LỢI ÍCH TỪ RỪNG', 'Lượng khai thác gỗ có dựa trên tài liệu chứng minh không?', 'Kiểm tra tài liệu', 'Bảng ước tính sản lượng'),
  ('GioiHanKhaiThac', 'LỢI ÍCH TỪ RỪNG', 'Lượng gỗ khai thác hàng năm có đảm bảo không vượt quá lượng tăng trưởng không?', 'Kiểm tra số liệu', 'Báo cáo khai thác'),

  -- MOI TRUONG
  ('NganNguaTacDongXau', 'MÔI TRƯỜNG', 'Các hoạt động quản lý có ngăn ngừa tác động tiêu cực tới môi trường không?', 'Quan sát thực tế', 'Báo cáo đánh giá'),
  ('GiamThieuTacDong', 'MÔI TRƯỜNG', 'Tại nơi xảy ra tác động tiêu cực, có áp dụng biện pháp ngăn chặn không?', 'Kiểm tra', 'Biên bản khắc phục'),
  ('BaoVeLoaiQuyHiem', 'MÔI TRƯỜNG', 'Có xác định và bảo vệ các loài quý hiếm không?', 'Kiểm tra danh mục', 'Danh sách loài'),
  ('NganChanSanBat', 'MÔI TRƯỜNG', 'Có biện pháp ngăn chặn săn bắt các loài quý hiếm không?', 'Phỏng vấn', 'Biển cấm, nội quy'),
  ('TuanThuBaoVeDongVat', 'MÔI TRƯỜNG', 'Có tuân thủ quy định về bảo vệ động vật hoang dã không?', 'Kiểm tra', 'Cam kết bảo vệ ĐVHD'),
  ('NganNguoiLaoDongSanBat', 'MÔI TRƯỜNG', 'Có đảm bảo người lao động không tham gia săn bắn các loài bị cấm không?', 'Phỏng vấn NLĐ', 'Nội quy, cam kết'),
  ('BaoVeNguonNuoc', 'MÔI TRƯỜNG', 'Có thực hiện biện pháp bảo vệ nguồn nước không?', 'Quan sát thực tế', 'Bản đồ nguồn nước'),
  ('PhucHoiNguonNuoc', 'MÔI TRƯỜNG', 'Nếu chưa bảo vệ tốt, có thực hiện phục hồi nguồn nước không?', 'Kiểm tra', 'Báo cáo phục hồi'),
  ('KhacPhucHauQuaCu', 'MÔI TRƯỜNG', 'Có thực hiện phục hồi nguồn nước bị ảnh hưởng trong quá khứ không?', 'Kiểm tra', 'Hồ sơ phục hồi'),
  ('NganChanSuyThoaiTiepDien', 'MÔI TRƯỜNG', 'Có biện pháp ngăn chặn suy thoái nguồn nước do các bên khác không?', 'Phỏng vấn', 'Biên bản phối hợp'),
  ('KhongChuyenDoiRungTuNhien', 'MÔI TRƯỜNG', 'Có đảm bảo không chuyển đổi rừng tự nhiên sang rừng trồng không?', 'Kiểm tra bản đồ', 'Bản đồ hiện trạng'),
  ('ChungChiKhuVucChuyenDoi', 'MÔI TRƯỜNG', 'Các khu vực chuyển đổi từ rừng tự nhiên sau 1994 có đáp ứng đủ điều kiện không?', 'Kiểm tra tài liệu', 'Hồ sơ chuyển đổi'),

  -- KE HOACH QUAN LY
  ('CongKhaiKeHoach', 'KẾ HOẠCH QUẢN LÝ', 'Bản tóm tắt Kế hoạch Quản lý rừng có được công khai miễn phí không?', 'Kiểm tra tài liệu', 'Bản tóm tắt KHQLR'),

  -- GIAM SAT & DANH GIA
  ('HeThongTruyXuat', 'GIÁM SÁT & ĐÁNH GIÁ', 'Có hệ thống theo dõi và truy xuất nguồn gốc sản phẩm FSC không?', 'Kiểm tra hệ thống', 'Sổ theo dõi CoC'),
  ('TaiLieuHoaSanPham', 'GIÁM SÁT & ĐÁNH GIÁ', 'Thông tin chi tiết về sản phẩm đã bán có được ghi chép đầy đủ không?', 'Kiểm tra hồ sơ', 'Sổ bán hàng'),
  ('LuuTruHoaDon', 'GIÁM SÁT & ĐÁNH GIÁ', 'Các hóa đơn bán hàng có được lưu giữ ít nhất 5 năm không?', 'Kiểm tra', 'Hóa đơn, chứng từ'),

  -- THUC HIEN QUAN LY
  ('TrongRungSauKhaiThac', 'THỰC HIỆN QUẢN LÝ', 'Hiện trường khai thác có được trồng lại ngay trong 1 mùa vụ không?', 'Quan sát, kiểm tra', 'Ảnh hiện trường'),
  ('LoaiCayPhuHop', 'THỰC HIỆN QUẢN LÝ', 'Việc lựa chọn loài cây trồng có phù hợp với điều kiện lập địa không?', 'Quan sát', 'Thiết kế trồng rừng'),
  ('KiemSoatLoaiXamLan', 'THỰC HIỆN QUẢN LÝ', 'Danh sách các loài xâm lấn ngoại lai có được cập nhật không?', 'Kiểm tra danh mục', 'Danh sách loài xâm lấn'),
  ('KhongGMO', 'THỰC HIỆN QUẢN LÝ', 'Có đảm bảo không sử dụng sinh vật biến đổi gen không?', 'Phỏng vấn', 'Cam kết không GMO'),
  ('BienPhapLamSinh', 'THỰC HIỆN QUẢN LÝ', 'Các biện pháp lâm sinh có phù hợp không?', 'Kiểm tra thực tế', 'Hồ sơ kỹ thuật'),
  ('HanChePhanBonHoaHoc', 'THỰC HIỆN QUẢN LÝ', 'Việc sử dụng phân bón hóa học có được hạn chế không?', 'Phỏng vấn', 'Sổ theo dõi phân bón'),
  ('GiamThieuTacHaiPhanBon', 'THỰC HIỆN QUẢN LÝ', 'Có biện pháp giảm thiểu thiệt hại môi trường do phân bón hóa học không?', 'Kiểm tra', 'Báo cáo đánh giá'),
  ('KhongSuDungThuocCam', 'THỰC HIỆN QUẢN LÝ', 'Có đảm bảo không sử dụng thuốc BVTV bị cấm bởi FSC không?', 'Kiểm tra kho thuốc', 'Danh mục thuốc'),
  ('GhiChepSuDungThuoc', 'THỰC HIỆN QUẢN LÝ', 'Có hồ sơ ghi chép chi tiết việc sử dụng thuốc BVTV không?', 'Kiểm tra sổ sách', 'Sổ theo dõi thuốc BVTV'),
  ('AnToanSuDungThuoc', 'THỰC HIỆN QUẢN LÝ', 'Việc sử dụng thuốc BVTV có tuân thủ hướng dẫn an toàn không?', 'Quan sát', 'Hướng dẫn sử dụng'),
  ('GiamThieuLuongThuoc', 'THỰC HIỆN QUẢN LÝ', 'Có biện pháp giảm thiểu lượng thuốc BVTV sử dụng không?', 'Phỏng vấn', 'Kế hoạch IPM'),
  ('HanCheAnhHuongSucKhoe', 'THỰC HIỆN QUẢN LÝ', 'Có biện pháp hạn chế tác hại của thuốc BVTV đến sức khỏe không?', 'Kiểm tra BHLD', 'Danh sách BHLD'),
  ('DanhMucThuocDuocPhep', 'THỰC HIỆN QUẢN LÝ', 'Chỉ sử dụng các loại thuốc BVTV nằm trong danh mục cho phép không?', 'Kiểm tra danh mục', 'Danh mục FSC'),
  ('KiemSoatSinhHoc', 'THỰC HIỆN QUẢN LÝ', 'Các tác nhân kiểm soát sinh học có được cập nhật không?', 'Kiểm tra', 'Danh sách tác nhân'),
  ('CanhBaoChayRung', 'THỰC HIỆN QUẢN LÝ', 'Hệ thống cảnh báo cháy rừng có hoạt động hiệu quả không?', 'Kiểm tra thực tế', 'Bảng nội quy PCCC'),
  ('CapNhatVuChay', 'THỰC HIỆN QUẢN LÝ', 'Thông tin về các vụ cháy rừng có được cập nhật đầy đủ không?', 'Kiểm tra sổ sách', 'Sổ theo dõi cháy rừng'),
  ('QuanLyRacThai', 'THỰC HIỆN QUẢN LÝ', 'Có đảm bảo không vứt rác thải bừa bãi không?', 'Quan sát thực tế', 'Ảnh hiện trường'),
  ('XuLyRacThai', 'THỰC HIỆN QUẢN LÝ', 'Hệ thống xử lý rác thải có hoạt động đúng chức năng không?', 'Kiểm tra', 'Hợp đồng xử lý rác');
