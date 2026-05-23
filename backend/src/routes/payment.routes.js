const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const { buildVietQR } = require('../utils/paymentConfig');

// GET /api/payments/:bookingId/qr
router.get('/:bookingId/qr', authenticate, async (req, res) => {
  db.query(`SELECT p.*,b.booking_code,b.total_price,b.user_id FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.booking_id=?`,
    [req.params.bookingId], async (err, results) => {
    if (!results || !results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    if (results[0].user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }
    const payment = results[0];
    const paymentQr = await buildVietQR(payment.amount, payment.booking_code);
    res.json({ success: true, data: {
      bookingCode: payment.booking_code, amount: paymentQr.amount,
      status: payment.status, vietQRUrl: paymentQr.vietQRUrl,
      qrImageBase64: paymentQr.qrImageBase64, bankInfo: paymentQr.bankInfo,
      description: paymentQr.description
    }});
  });
});

// POST /api/payments/:bookingId/confirm
router.post('/:bookingId/confirm', authenticate, (req, res) => {
  const { transaction_id } = req.body;
  db.query("UPDATE payments SET status='paid',transaction_id=?,paid_at=NOW() WHERE booking_id=?",
    [transaction_id||null, req.params.bookingId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    db.query("UPDATE bookings SET status='confirmed',confirmed_at=NOW() WHERE id=?", [req.params.bookingId], () => {});
    res.json({ success: true, message: 'Xác nhận thanh toán thành công' });
  });
});

// GET /api/payments/my - Lịch sử thanh toán của user
router.get('/my', authenticate, async (req, res) => {
  const { page=1, limit=20 } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT p.*,b.booking_code,b.status as booking_status,b.total_price,
        c.name as court_name,v.name as venue_name,ts.slot_date
      FROM payments p JOIN bookings b ON b.id=p.booking_id
      JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id
      JOIN time_slots ts ON ts.id=b.slot_id
      WHERE b.user_id=? ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/payments/:bookingId/method - Cập nhật phương thức thanh toán
router.put('/:bookingId/method', authenticate, async (req, res) => {
  const { method } = req.body;
  const allowed = ['cash','transfer','momo','zalopay','vnpay'];
  if (!allowed.includes(method)) return res.status(400).json({ success: false, message: 'Phương thức không hợp lệ' });
  try {
    const [rows] = await db.query('SELECT b.user_id FROM bookings b WHERE b.id=?', [req.params.bookingId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền' });
    await db.query('UPDATE payments SET method=? WHERE booking_id=?', [method, req.params.bookingId]);
    res.json({ success: true, message: 'Đã cập nhật phương thức thanh toán' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
