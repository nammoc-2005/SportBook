const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const { buildVietQR } = require('../utils/paymentConfig');

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
    const paymentQr = await buildVietQR(payment.amount, payment.booking_code);

    res.json({
      success: true,
      data: {
        bookingCode: payment.booking_code,
        amount: paymentQr.amount,
        status: payment.status,
        vietQRUrl: paymentQr.vietQRUrl,
        qrImageBase64: paymentQr.qrImageBase64,
        bankInfo: paymentQr.bankInfo,
        description: paymentQr.description
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
