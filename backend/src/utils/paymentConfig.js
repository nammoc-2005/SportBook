const db = require('../config/db');

const SETTING_KEYS = ['bank_id', 'account_no', 'account_name'];

function fallbackConfig() {
  return {
    bankId: process.env.BANK_ID || '970436',
    accountNo: process.env.BANK_ACCOUNT || '1234567890',
    accountName: process.env.ACCOUNT_NAME || 'SPORTBOOK',
  };
}

async function getPaymentConfig() {
  const fallback = fallbackConfig();

  try {
    const [rows] = await db.query(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?, ?)',
      SETTING_KEYS
    );
    const settings = rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    return {
      bankId: settings.bank_id || fallback.bankId,
      accountNo: settings.account_no || fallback.accountNo,
      accountName: settings.account_name || fallback.accountName,
    };
  } catch (err) {
    return fallback;
  }
}

async function savePaymentConfig({ bankId, accountNo, accountName }) {
  const normalized = {
    bank_id: String(bankId || '').trim(),
    account_no: String(accountNo || '').trim(),
    account_name: String(accountName || '').trim().toUpperCase(),
  };

  if (!normalized.bank_id || !normalized.account_no || !normalized.account_name) {
    const error = new Error('Thiếu bankId, accountNo hoặc accountName');
    error.status = 400;
    throw error;
  }

  const values = Object.entries(normalized).map(([key, value]) => [key, value]);
  await db.query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ?
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    [values]
  );

  return {
    bankId: normalized.bank_id,
    accountNo: normalized.account_no,
    accountName: normalized.account_name,
  };
}

async function buildVietQR(amount, bookingCode) {
  const config = await getPaymentConfig();
  const numericAmount = Math.round(Number(amount || 0));
  const description = `DAT SAN ${bookingCode}`;
  const vietQRUrl =
    `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-compact2.png` +
    `?amount=${numericAmount}` +
    `&addInfo=${encodeURIComponent(description)}` +
    `&accountName=${encodeURIComponent(config.accountName)}`;

  return {
    vietQRUrl,
    qrImageBase64: null,
    qrData: vietQRUrl,
    bankInfo: config,
    description,
    amount: numericAmount,
  };
}

module.exports = {
  getPaymentConfig,
  savePaymentConfig,
  buildVietQR,
};
