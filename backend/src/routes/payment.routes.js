const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const QRCode = require('qrcode');

// GET /api/payments/:bookingId/qr - Lấy QR code
router.get('/:bookingId/qr', authenticate, async (req, res) => {
  db.query(`
    SELECT p.*, b.booking_code, b.total_price, b.user_id
    FROM payments p JOIN bookings b ON b.id = p.booking_id
    WHERE p.booking_id = ?`, [req.params.bookingId], async (err, results) => {
    if (!results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    if (results[0].user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    const payment = results[0];
    const bankId = process.env.BANK_ID || '970436';
    const accountNo = process.env.BANK_ACCOUNT || '1234567890';
    const accountName = process.env.ACCOUNT_NAME || 'SPORTBOOK';
    const description = `DAT SAN ${payment.booking_code}`;
    const vietQRUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${payment.amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    const qrData = JSON.stringify({ bankId, accountNo, accountName, amount: payment.amount, description, bookingCode: payment.booking_code });
    const qrImageBase64 = await QRCode.toDataURL(qrData, { width: 300, margin: 2 }).catch(() => null);

    res.json({
      success: true,
      data: {
        bookingCode: payment.booking_code,
        amount: payment.amount,
        status: payment.status,
        vietQRUrl,
        qrImageBase64,
        bankInfo: { bankId, accountNo, accountName },
        description
      }
    });
  });
});

// POST /api/payments/:bookingId/confirm - Xác nhận thanh toán
router.post('/:bookingId/confirm', authenticate, (req, res) => {
  const { transaction_id } = req.body;
  db.query("UPDATE payments SET status = 'paid', transaction_id = ? WHERE booking_id = ?",
    [transaction_id || null, req.params.bookingId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    db.query("UPDATE bookings SET status = 'confirmed' WHERE id = ?", [req.params.bookingId], () => {});
    res.json({ success: true, message: 'Xác nhận thanh toán thành công' });
  });
});

module.exports = router;
