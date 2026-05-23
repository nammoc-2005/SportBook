/**
 * paymentConfig.js — VietQR integration
 *
 * Cách hoạt động:
 *   - Tạo URL ảnh QR từ api.vietqr.io (miễn phí, không cần đăng ký)
 *   - URL nhúng đúng: số tài khoản, ngân hàng, số tiền, nội dung CK
 *   - App/mobile hiển thị ảnh QR này → user quét bằng bất kỳ app ngân hàng nào
 *
 * Cấu hình (trong .env hoặc bảng app_settings):
 *   BANK_ID       = BIN ngân hàng (xem BANK_LIST bên dưới)
 *   BANK_ACCOUNT  = Số tài khoản của bạn
 *   ACCOUNT_NAME  = Tên chủ tài khoản (không dấu, in hoa)
 */

const db = require('../config/db');

// ─── Danh sách ngân hàng phổ biến (BIN) ────────────────────────────────────
const BANK_LIST = [
  { bin: '970436', shortName: 'Vietcombank',  name: 'Ngân hàng Vietcombank',    logo: 'https://cdn.vietqr.io/img/VCB.png' },
  { bin: '970418', shortName: 'BIDV',         name: 'Ngân hàng BIDV',           logo: 'https://cdn.vietqr.io/img/BIDV.png' },
  { bin: '970415', shortName: 'VietinBank',   name: 'Ngân hàng VietinBank',     logo: 'https://cdn.vietqr.io/img/ICB.png' },
  { bin: '970405', shortName: 'Agribank',     name: 'Ngân hàng Agribank',       logo: 'https://cdn.vietqr.io/img/VBA.png' },
  { bin: '970422', shortName: 'MBBank',       name: 'Ngân hàng MB Bank',        logo: 'https://cdn.vietqr.io/img/MB.png' },
  { bin: '970407', shortName: 'Techcombank',  name: 'Ngân hàng Techcombank',    logo: 'https://cdn.vietqr.io/img/TCB.png' },
  { bin: '970416', shortName: 'ACB',          name: 'Ngân hàng ACB',            logo: 'https://cdn.vietqr.io/img/ACB.png' },
  { bin: '970432', shortName: 'VPBank',       name: 'Ngân hàng VPBank',         logo: 'https://cdn.vietqr.io/img/VPB.png' },
  { bin: '970423', shortName: 'TPBank',       name: 'Ngân hàng TPBank',         logo: 'https://cdn.vietqr.io/img/TPB.png' },
  { bin: '970403', shortName: 'Sacombank',    name: 'Ngân hàng Sacombank',      logo: 'https://cdn.vietqr.io/img/STB.png' },
  { bin: '970437', shortName: 'HDBank',       name: 'Ngân hàng HDBank',         logo: 'https://cdn.vietqr.io/img/HDB.png' },
  { bin: '970441', shortName: 'VIB',          name: 'Ngân hàng VIB',            logo: 'https://cdn.vietqr.io/img/VIB.png' },
  { bin: '970443', shortName: 'SHB',          name: 'Ngân hàng SHB',            logo: 'https://cdn.vietqr.io/img/SHB.png' },
  { bin: '970431', shortName: 'Eximbank',     name: 'Ngân hàng Eximbank',       logo: 'https://cdn.vietqr.io/img/EIB.png' },
  { bin: '970449', shortName: 'LPBank',       name: 'Ngân hàng LPBank',         logo: 'https://cdn.vietqr.io/img/LPB.png' },
  { bin: '970448', shortName: 'OCB',          name: 'Ngân hàng OCB',            logo: 'https://cdn.vietqr.io/img/OCB.png' },
  { bin: '970440', shortName: 'SeABank',      name: 'Ngân hàng SeABank',        logo: 'https://cdn.vietqr.io/img/SEAB.png' },
  { bin: '970426', shortName: 'MSB',          name: 'Ngân hàng MSB',            logo: 'https://cdn.vietqr.io/img/MSB.png' },
  { bin: '970424', shortName: 'ShinhanBank',  name: 'Ngân hàng Shinhan',        logo: 'https://cdn.vietqr.io/img/SHBVN.png' },
  { bin: '546034', shortName: 'CAKE',         name: 'CAKE by VPBank',           logo: 'https://cdn.vietqr.io/img/CAKE.png' },
  { bin: '971025', shortName: 'MoMo',         name: 'Ví MoMo',                  logo: 'https://cdn.vietqr.io/img/momo.png' },
];

const SETTING_KEYS = ['bank_id', 'account_no', 'account_name'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fallbackConfig() {
  return {
    bankId:      process.env.BANK_ID      || '970436',
    accountNo:   process.env.BANK_ACCOUNT || '1234567890',
    accountName: process.env.ACCOUNT_NAME || 'SPORTBOOK',
  };
}

function getBankInfo(bankId) {
  return BANK_LIST.find(b => b.bin === String(bankId)) || null;
}

// ─── Đọc config từ DB (fallback về .env) ─────────────────────────────────────
async function getPaymentConfig() {
  const fallback = fallbackConfig();
  try {
    const [rows] = await db.query(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?, ?)',
      SETTING_KEYS
    );
    const settings = rows.reduce((acc, r) => { acc[r.setting_key] = r.setting_value; return acc; }, {});
    return {
      bankId:      settings.bank_id      || fallback.bankId,
      accountNo:   settings.account_no   || fallback.accountNo,
      accountName: settings.account_name || fallback.accountName,
    };
  } catch {
    return fallback;
  }
}

// ─── Lưu config vào DB ────────────────────────────────────────────────────────
async function savePaymentConfig({ bankId, accountNo, accountName }) {
  const normalized = {
    bank_id:      String(bankId      || '').trim(),
    account_no:   String(accountNo   || '').trim(),
    account_name: String(accountName || '').trim().toUpperCase(),
  };

  if (!normalized.bank_id || !normalized.account_no || !normalized.account_name) {
    const err = new Error('Thiếu bankId, accountNo hoặc accountName');
    err.status = 400;
    throw err;
  }

  const values = Object.entries(normalized).map(([k, v]) => [k, v]);
  await db.query(
    `INSERT INTO app_settings (setting_key, setting_value) VALUES ?
     ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=CURRENT_TIMESTAMP`,
    [values]
  );

  return {
    bankId:      normalized.bank_id,
    accountNo:   normalized.account_no,
    accountName: normalized.account_name,
    bankInfo:    getBankInfo(normalized.bank_id),
  };
}

// ─── Build VietQR URL ─────────────────────────────────────────────────────────
/**
 * Tạo URL ảnh QR VietQR nhúng đúng số tiền và tài khoản.
 *
 * Định dạng URL:
 *   https://img.vietqr.io/image/{BIN}-{STK}-{template}.png
 *   ?amount={số_tiền}
 *   &addInfo={nội_dung_chuyển_khoản}
 *   &accountName={tên_tài_khoản}
 *
 * Template:
 *   - compact2  → gọn (chỉ QR + logo ngân hàng)
 *   - compact   → có thêm thông tin tài khoản
 *   - qr_only   → chỉ QR không logo (nhỏ nhất)
 */
async function buildVietQR(amount, bookingCode, template = 'compact2') {
  const config = await getPaymentConfig();
  const numericAmount = Math.round(Number(amount || 0));

  // Nội dung chuyển khoản: không dấu, không ký tự đặc biệt (chuẩn VietQR)
  const description = `DAT SAN ${bookingCode}`;

  // URL ảnh QR — nhúng trực tiếp vào <Image> trong React Native / <img> trong web
  const vietQRUrl =
    `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-${template}.png` +
    `?amount=${numericAmount}` +
    `&addInfo=${encodeURIComponent(description)}` +
    `&accountName=${encodeURIComponent(config.accountName)}`;

  const bankInfo = getBankInfo(config.bankId);

  return {
    vietQRUrl,       // URL ảnh QR → hiển thị trực tiếp trong app
    qrImageBase64: null,  // Nếu cần base64, dùng thư viện qrcode (xem bên dưới)
    bankInfo: {
      ...bankInfo,
      accountNo:   config.accountNo,
      accountName: config.accountName,
    },
    description,
    amount: numericAmount,
    formattedAmount: numericAmount.toLocaleString('vi-VN') + ' đ',
  };
}

// ─── API: Lấy danh sách ngân hàng ─────────────────────────────────────────────
function getBankList() {
  return BANK_LIST;
}

module.exports = {
  getPaymentConfig,
  savePaymentConfig,
  buildVietQR,
  getBankList,
  getBankInfo,
};
