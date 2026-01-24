// <<< ĐIỀN ID SHEET CỦA BẠN VÀO ĐÂY >>>
const SPREADSHEET_ID = '14dBMBA3iT7IwziKcCTs9J77PCg4fyWE4zTB2bhlZyRU'; 
const SS = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();

/**
 * 1. XỬ LÝ GET REQUEST (Lấy dữ liệu)
 * Ví dụ: gọi ?action=getConfigs
 */
function doGet(e) {
  const action = e.parameter.action;
  let result = {};

  try {
    if (action === 'getConfigs') {
      result = getConfigs();
    } else if (action === 'getReportData') {
      result = getReportData();
    } else if (action === 'getUserList') {
      result = getUserList();
    } else if (action === 'printData') {
      // Với GET printData cần productId
      const id = e.parameter.productId;
      result = getPrintData(id);
    } else {
      result = { success: false, message: 'Invalid Action GET' };
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }

  return responseJSON(result);
}

/**
 * 2. XỬ LÝ POST REQUEST (Gửi dữ liệu: Đăng nhập, Thêm, Sửa, Xóa)
 */
function doPost(e) {
  let result = {};
  try {
    // Lấy dữ liệu gửi lên
    const postData = JSON.parse(e.postData.contents);
    const action = e.parameter.action;

    if (action === 'login') {
      result = userLogin(postData.username, postData.password);
    } else if (action === 'addProduct') {
      result = addProduct(postData);
    } else if (action === 'deleteProduct') {
      result = deleteProduct(postData.id);
    } else if (action === 'sellProduct') {
      result = sellProduct(postData.id);
    } else if (action === 'updateSoldProduct') {
      result = updateSoldProduct(postData);
    } else if (action === 'manageUser') {
      result = manageUser(postData.actionType, postData.userData);
    } else {
      result = { success: false, message: 'Invalid Action POST' };
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }

  return responseJSON(result);
}

// --- HELPER TRẢ VỀ JSON CHO WEB BÊN NGOÀI ---
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- CÁC HÀM XỬ LÝ LOGIC (GIỮ NGUYÊN NHƯ CŨ) ---

function getData(sheetName) {
  if (!SS) throw new Error("Chưa kết nối Google Sheet");
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h.toString().trim()] = row[i]);
    return obj;
  });
}

function userLogin(username, password) {
  try {
    const users = getData('User');
    const user = users.find(u => 
      String(u.ID).trim().toLowerCase() == String(username).trim().toLowerCase() && 
      String(u.Password) == String(password) && 
      String(u.Status).trim() == 'Act'
    );
    return user ? { success: true, user: user } : { success: false, message: 'Sai ID hoặc mật khẩu!' };
  } catch (e) { return { success: false, message: e.message }; }
}

function getConfigs() {
  return {
    nxs: getData('DANH_MUC'),
    hlv: getData('HLV'),
    store: getData('THIET_LAP_CHUNG')[0] || {}
  };
}

function getReportData() {
  const products = getData('KHO_HANG');
  const stock = products.filter(p => p.Trang_Thai === 'Tồn kho').length;
  const soldItems = products.filter(p => p.Trang_Thai === 'Đã bán');
  let revenue = 0;
  soldItems.forEach(p => {
    let price = parseFloat(String(p.Gia_Ban).replace(/,/g, '').replace(/\./g, '')) || 0;
    revenue += price;
  });
  return { stock: stock, sold: soldItems.length, revenue: revenue, products: products };
}

function getUserList() { return getData('User'); }

function addProduct(form) {
  const sheet = SS.getSheetByName('KHO_HANG');
  const now = new Date();
  const timeZone = Session.getScriptTimeZone();
  const timeStr = Utilities.formatDate(now, timeZone, "HHmmssddMM");
  const id = (form.kyHieu || 'SP') + timeStr;
  const klv = (parseFloat(form.klt || 0) - parseFloat(form.klh || 0)).toFixed(1);
  const ngayNhap = Utilities.formatDate(now, timeZone, "dd/MM/yyyy");
  const giaNhap = form.giaNhap ? form.giaNhap.toString() : '0';
  const giaBan = form.giaBan ? form.giaBan.toString() : '0';

  sheet.appendRow([
    id, form.tenSp, form.kyHieu, form.xuatXu, form.hlv,
    parseFloat(form.klt || 0).toFixed(1), parseFloat(form.klh || 0).toFixed(1), klv,
    form.maNxs, form.tccs, giaNhap, giaBan,
    'Tồn kho', ngayNhap, ''
  ]);
  return { success: true, message: 'Đã nhập: ' + id };
}

function deleteProduct(id) {
  const sheet = SS.getSheetByName('KHO_HANG');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Không tìm thấy sản phẩm' };
}

function sellProduct(productId) {
  const sheet = SS.getSheetByName('KHO_HANG');
  const data = sheet.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == productId) {
      sheet.getRange(i + 1, 13).setValue('Đã bán'); 
      if(sheet.getLastColumn() < 15) sheet.getRange(1, 15).setValue("Ngay_Ban");
      sheet.getRange(i + 1, 15).setValue(today);
      const pData = getData('KHO_HANG').find(p => p.ID == productId);
      const store = getData('THIET_LAP_CHUNG')[0] || {};
      return { success: true, product: pData, store: store };
    }
  }
  return { success: false, message: 'Không tìm thấy SP' };
}

function updateSoldProduct(form) {
  const sheet = SS.getSheetByName('KHO_HANG');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == form.editId) {
       sheet.getRange(i + 1, 12).setValue(form.editGiaBan);
       return { success: true };
    }
  }
  return { success: false, message: 'Lỗi cập nhật' };
}

function manageUser(actionType, userData) {
  const sheet = SS.getSheetByName('User');
  const rows = sheet.getDataRange().getValues();
  if (actionType === 'add') {
     for(let i=1; i<rows.length; i++) if(rows[i][0] == userData.id) return {success: false, message: 'ID đã tồn tại'};
     sheet.appendRow([userData.id, userData.username, userData.password, userData.phone, userData.status]);
     return {success: true, message: 'Đã thêm'};
  }
  if (actionType === 'edit') {
     for(let i=1; i<rows.length; i++) {
       if(rows[i][0] == userData.id) {
         sheet.getRange(i+1, 2).setValue(userData.username);
         if(userData.password) sheet.getRange(i+1, 3).setValue(userData.password);
         sheet.getRange(i+1, 4).setValue(userData.phone);
         sheet.getRange(i+1, 5).setValue(userData.status);
         return {success: true, message: 'Đã cập nhật'};
       }
     }
  }
  if (actionType === 'delete') {
     for(let i=1; i<rows.length; i++) {
       if(rows[i][0] == userData.id) { sheet.deleteRow(i+1); return {success: true, message: 'Đã xóa'}; }
     }
  }
  return {success: false};
}

function getPrintData(productId) {
  const products = getData('KHO_HANG');
  const product = products.find(p => p.ID == productId);
  if (!product) return null;
  const nxsList = getData('DANH_MUC');
  const nxs = nxsList.find(n => n.Ma_NXS == product.Ma_NXS) || {};
  const store = getData('THIET_LAP_CHUNG')[0] || {};
  return { product, nxs, store };
}
