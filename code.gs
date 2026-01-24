// --- CẤU HÌNH HỆ THỐNG ---
const SPREADSHEET_ID = '14dBMBA3iT7IwziKcCTs9J77PCg4fyWE4zTB2bhlZyRU'; // Thay ID file của bạn vào đây nếu khác

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Hệ thống Quản lý Rừng FSC')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) { 
  return HtmlService.createHtmlOutputFromFile(filename).getContent(); 
}

// --- HÀM HỖ TRỢ: ĐỌC DỮ LIỆU NHANH ---
function getDataFromSheet(ws) {
  const lastRow = ws.getLastRow();
  const lastCol = ws.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  
  const values = ws.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  const headers = values[0];
  const rows = values.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => { if(h) obj[h.trim()] = row[i]; });
    return obj;
  });
}

// --- 1. API: ĐĂNG NHẬP & TẢI FULL DATA ---
function apiLoginAndLoadData(email, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const wsUser = ss.getSheetByName('NhanSu');
    if (!wsUser) return { success: false, message: "Thiếu sheet NhanSu" };
    
    const userData = getDataFromSheet(wsUser);
    const user = userData.find(u => String(u['Email']).toLowerCase().trim() === String(email).toLowerCase().trim());
    
    if (!user) return { success: false, message: 'Email không tồn tại!' };
    
    if (String(user['Mật khẩu']).trim() !== String(password).trim()) {
      return { success: false, message: 'Sai mật khẩu!' };
    }

    // Kiểm tra trạng thái kích hoạt
    const status = String(user['Trạng thái']).trim();
    if (status !== 'Act') {
      return { success: false, message: 'Tài khoản chưa kích hoạt hoặc đã bị khóa (inAct)!' };
    }
    
    let safeUser = {...user}; delete safeUser['Mật khẩu'];

    // Tải dữ liệu hệ thống (Bao gồm cả NhanSu để quản lý)
    const sheetsToLoad = ['Menu', 'NhanSu', 'NhomCCR', 'Churung', 'Lo_rung', 'Taphuan']; 
    const appData = {};

    sheetsToLoad.forEach(sheetName => {
      const ws = ss.getSheetByName(sheetName);
      if (ws) {
        appData[sheetName] = getDataFromSheet(ws);
      } else {
        appData[sheetName] = [];
      }
    });

    return { success: true, user: safeUser, data: appData };

  } catch (e) {
    return { success: false, message: "Lỗi Server: " + e.toString() };
  }
}

// --- 2. API: ĐĂNG KÝ THÀNH VIÊN (ID TĂNG TỰ ĐỘNG + GỬI MAIL ADMIN) ---
function apiRegister(fullName, email, password, phone) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName('NhanSu');
    const data = ws.getDataRange().getDisplayValues();
    const headers = data[0];
    
    // Kiểm tra Email trùng
    const emailIdx = headers.indexOf('Email');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailIdx]).toLowerCase().trim() === String(email).toLowerCase().trim()) {
        return { success: false, message: "Email này đã được sử dụng!" };
      }
    }
    
    // Sinh ID mới (FSC_ST_xxx)
    const newID = generateNextStaffID(ws, headers);
    
    const newUserObj = {
      'ID_staff': newID, // Dùng đúng tên cột ID_staff
      'Họ và tên': fullName,
      'Email': email,
      'Mật khẩu': password,
      'Số điện thoại': phone,
      'Chức vụ': 'Thành viên',      
      'Trạng thái': 'Pending' 
    };
    
    let newRow = [];
    headers.forEach(h => newRow.push(newUserObj[h] || ''));
    ws.appendRow(newRow);
    
    // Gửi mail cho Admin báo có người mới
    try {
      sendEmailToAdmins(ws, headers, fullName, email, newID);
    } catch (err) {
      Logger.log("Lỗi gửi mail Admin: " + err.toString());
    }

    return { success: true, message: `Đăng ký thành công! Mã: ${newID}. Vui lòng chờ Admin duyệt.` };
  } catch (e) {
    return { success: false, message: "Lỗi Server: " + e.toString() };
  }
}

// --- 3. API: CRUD (CÓ TỰ ĐỘNG GỬI MAIL KHI KÍCH HOẠT) ---
function apiCRUD(action, sheetName, jsonData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName(sheetName);
    if (!ws) return { success: false, message: 'Không tìm thấy Sheet: ' + sheetName };

    const dataObj = JSON.parse(jsonData);
    const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
    const idColumnName = headers[0]; 
    const idValue = dataObj[idColumnName];

    if (action === 'DELETE') {
       const data = ws.getDataRange().getValues();
       for (let i = 1; i < data.length; i++) {
         if (String(data[i][0]) === String(idValue)) {
           ws.deleteRow(i + 1);
           return { success: true, message: 'Đã xóa thành công!' };
         }
       }
       return { success: false, message: 'Không tìm thấy ID.' };
    }

    if (action === 'CREATE') {
       const newID = generateID(sheetName); 
       let newRow = [];
       headers.forEach(h => {
         if (h === idColumnName) newRow.push(newID);
         else newRow.push(dataObj[h] || '');
       });
       ws.appendRow(newRow);
       return { success: true, message: 'Thêm mới thành công!', newID: newID };
    }

    if (action === 'UPDATE') {
      const data = ws.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(idValue)) {
          
          // Logic gửi mail khi Admin kích hoạt tài khoản (NhanSu)
          if (sheetName === 'NhanSu') {
             const statusIdx = headers.indexOf('Trạng thái');
             const emailIdx = headers.indexOf('Email');
             const nameIdx = headers.indexOf('Họ và tên');
             
             const oldStatus = data[i][statusIdx];
             const newStatus = dataObj['Trạng thái'];
             const userEmail = dataObj['Email'] || data[i][emailIdx];
             const userName = dataObj['Họ và tên'] || data[i][nameIdx];

             if (String(oldStatus) !== 'Act' && String(newStatus) === 'Act') {
                try {
                  MailApp.sendEmail({
                    to: userEmail,
                    subject: "[FSC SYSTEM] Tài khoản của bạn đã được kích hoạt!",
                    htmlBody: `<p>Chúc mừng <b>${userName}</b>,<br>Tài khoản của bạn đã được Admin phê duyệt. Bạn có thể đăng nhập ngay bây giờ.</p>`
                  });
                } catch (mailErr) {
                  Logger.log("Lỗi gửi mail User: " + mailErr.toString());
                }
             }
          }

          let updatedRow = [];
          headers.forEach((h, colIndex) => {
            if (dataObj.hasOwnProperty(h)) updatedRow.push(dataObj[h]);
            else updatedRow.push(data[i][colIndex]);
          });
          ws.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
          return { success: true, message: 'Cập nhật thành công!' };
        }
      }
      return { success: false, message: 'Không tìm thấy ID.' };
    }
  } catch (e) {
    return { success: false, message: 'Lỗi CRUD: ' + e.toString() };
  }
}

// --- 4. API: ADMIN DUYỆT NHANH ---
function apiApproveUser(adminEmail, targetID) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName('NhanSu');
    const data = ws.getDataRange().getDisplayValues();
    const headers = data[0];
    
    // Tìm đúng cột (Ưu tiên ID_staff, nếu không có thì tìm ID nhân sự)
    let idIdx = headers.indexOf('ID_staff');
    if (idIdx === -1) idIdx = headers.indexOf('ID nhân sự');

    const statusIdx = headers.indexOf('Trạng thái');
    const emailIdx = headers.indexOf('Email');
    
    let targetRowIndex = -1, targetEmail = '', targetName = '';
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(targetID)) {
        targetRowIndex = i + 1;
        targetEmail = data[i][emailIdx];
        targetName = data[i][headers.indexOf('Họ và tên')];
        break;
      }
    }
    
    if (targetRowIndex === -1) return { success: false, message: "Không tìm thấy nhân sự." };
    
    ws.getRange(targetRowIndex, statusIdx + 1).setValue('Act');
    
    try {
      MailApp.sendEmail({
        to: targetEmail,
        subject: "[FSC SYSTEM] Đã được phê duyệt",
        htmlBody: `<p>Xin chào ${targetName}, tài khoản ${targetID} đã được duyệt thành công.</p>`
      });
    } catch(e) {}

    return { success: true, message: "Đã duyệt thành công!" };
  } catch (e) { return { success: false, message: "Lỗi: " + e.toString() }; }
}

// --- 5. API: QUÊN MẬT KHẨU ---
function apiResetPassword(email) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = ss.getSheetByName('NhanSu');
    const data = ws.getDataRange().getDisplayValues();
    const headers = data[0];
    const emailIdx = headers.indexOf('Email');
    const passIdx = headers.indexOf('Mật khẩu');
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailIdx]).toLowerCase().trim() === String(email).toLowerCase().trim()) {
        rowIndex = i + 1; break;
      }
    }
    if (rowIndex === -1) return { success: false, message: "Email không tồn tại!" };
    
    const newPass = Math.random().toString(36).slice(-6).toUpperCase();
    ws.getRange(rowIndex, passIdx + 1).setValue(newPass);
    
    MailApp.sendEmail({
      to: email,
      subject: "[FSC SYSTEM] Mật khẩu mới",
      htmlBody: `<p>Mật khẩu mới của bạn là: <b>${newPass}</b></p>`
    });
    return { success: true, message: "Mật khẩu mới đã gửi về Email!" };
  } catch (e) { return { success: false, message: "Lỗi gửi mail: " + e.toString() }; }
}

// --- HELPERS ---
function generateNextStaffID(ws, headers) {
  let idIdx = headers.indexOf('ID_staff');
  if (idIdx === -1) idIdx = headers.indexOf('ID nhân sự');
  if (idIdx === -1) return 'FSC_ST_001';

  const data = ws.getDataRange().getDisplayValues();
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const val = String(data[i][idIdx]);
    if (val.startsWith('FSC_ST_')) {
      const num = parseInt(val.replace('FSC_ST_', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return 'FSC_ST_' + String(maxNum + 1).padStart(3, '0');
}

function sendEmailToAdmins(ws, headers, newName, newEmail, newID) {
  const data = ws.getDataRange().getDisplayValues();
  const emailIdx = headers.indexOf('Email');
  const roleIdx = headers.indexOf('Chức vụ');
  const admins = data.filter((r, i) => i > 0 && String(r[roleIdx]).toLowerCase().includes('admin'));
  
  admins.forEach(admin => {
    const adminEmail = admin[emailIdx];
    if (adminEmail && adminEmail.includes('@')) {
       MailApp.sendEmail({
        to: adminEmail,
        subject: "[FSC ADMIN] Thành viên mới: " + newName,
        htmlBody: `<p>Thành viên mới đăng ký:<br>- Tên: ${newName}<br>- ID: ${newID}<br>Vui lòng duyệt.</p>`
      });
    }
  });
}

function generateID(prefix) {
  return `${prefix.substring(0,3).toUpperCase()}-${new Date().getFullYear().toString().substr(-2)}-${Math.floor(1000+Math.random()*9000)}`;
}

// Hàm chạy thủ công để cấp quyền Mail
function CAP_QUYEN() { MailApp.getRemainingDailyQuota(); }
function clearCache() { CacheService.getScriptCache().remove("APP_MENU_DATA"); }
