const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { v4: uuidv4 } = require('uuid');
const { buildVietQR } = require('../utils/paymentConfig');

function queryAsync(conn, sql, params) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
  });
}

// POST /api/bookings
router.post('/', authenticate, (req, res) => {
  const { slot_id, promo_code, note } = req.body;
  if (!slot_id) return res.status(400).json({ success: false, message: 'Cần chọn slot' });

  db.getConnection((err, conn) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });

    conn.beginTransaction(async (err) => {
      if (err) { conn.release(); return res.status(500).json({ success: false, message: 'Transaction error' }); }

      try {
        // Lock slot
        const slots = await queryAsync(conn, `
          SELECT ts.*, c.price_per_hour, c.id as court_id, c.name as court_name, c.sport_type,
            v.name as venue_name, v.id as venue_id
          FROM time_slots ts
          JOIN courts c ON c.id = ts.court_id
          JOIN venues v ON v.id = c.venue_id
          WHERE ts.id = ? FOR UPDATE`, [slot_id]);

        if (!slots.length) throw new Error('Slot không tồn tại');
        const slot = slots[0];
        if (slot.status !== 'open') throw new Error('Slot này đã được đặt hoặc không còn trống');

        const price = slot.price_override || slot.price_per_hour;
        let totalPrice = price;
        let discountAmt = 0;
        let promoId = null;

        if (promo_code) {
          const promos = await queryAsync(conn, `
            SELECT * FROM promotions WHERE code = ? AND venue_id = ? AND is_active = 1
            AND CURDATE() BETWEEN start_date AND end_date AND used_count < usage_limit`,
            [promo_code, slot.venue_id]);
          if (promos.length) {
            const promo = promos[0];
            promoId = promo.id;
            if (promo.discount_pct > 0) discountAmt = totalPrice * promo.discount_pct / 100;
            else if (promo.discount_amt > 0) discountAmt = Math.min(promo.discount_amt, totalPrice);
            totalPrice = Math.max(0, totalPrice - discountAmt);
            await queryAsync(conn, 'UPDATE promotions SET used_count = used_count + 1 WHERE id = ?', [promo.id]);
          }
        }

        // Lock slot
        await queryAsync(conn, "UPDATE time_slots SET status = 'booked' WHERE id = ?", [slot_id]);

        // Create booking
        const bookingCode = 'SB' + Date.now().toString().slice(-8).toUpperCase();
        const bookingResult = await queryAsync(conn, `
          INSERT INTO bookings (user_id, slot_id, court_id, booking_code, total_price, discount_amt, promo_id, status, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [req.user.id, slot_id, slot.court_id, bookingCode, totalPrice, discountAmt, promoId, note || null]);

        const bookingId = bookingResult.insertId;

        // Create payment
        await queryAsync(conn, `INSERT INTO payments (booking_id, amount, method, status) VALUES (?, ?, 'transfer', 'pending')`,
          [bookingId, totalPrice]);

        // Create notification
        await queryAsync(conn, `INSERT INTO notifications (user_id, booking_id, type, title, message) VALUES (?, ?, 'booking', ?, ?)`,
          [req.user.id, bookingId, '🏟️ Đặt sân thành công!', `Đã đặt ${slot.court_name} tại ${slot.venue_name}. Mã: ${bookingCode}`]);

        const paymentQr = await buildVietQR(totalPrice, bookingCode);

        conn.commit((err) => {
          conn.release();
          if (err) return res.status(500).json({ success: false, message: 'Commit error' });

          res.status(201).json({
            success: true, message: 'Đặt sân thành công!',
            data: {
              bookingId, bookingCode, totalPrice, discountAmt,
              slotInfo: { date: slot.slot_date, startTime: slot.start_time, endTime: slot.end_time },
              courtName: slot.court_name, venueName: slot.venue_name,
              payment: paymentQr
            }
          });
        });

      } catch (error) {
        conn.rollback(() => conn.release());
        res.status(400).json({ success: false, message: error.message });
      }
    });
  });
});

// GET /api/bookings/my
router.get('/my', authenticate, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let conditions = ['b.user_id = ?'];
  let params = [req.user.id];
  if (status) { conditions.push('b.status = ?'); params.push(status); }

  db.query(`
    SELECT b.*, ts.slot_date, ts.start_time, ts.end_time,
      c.name as court_name, c.sport_type,
      v.name as venue_name, v.address as venue_address,
      (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as venue_image,
      p.status as payment_status, p.method as payment_method
    FROM bookings b
    JOIN time_slots ts ON ts.id = b.slot_id
    JOIN courts c ON c.id = b.court_id
    JOIN venues v ON v.id = c.venue_id
    LEFT JOIN payments p ON p.booking_id = b.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY b.booked_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      res.json({ success: true, data: results });
    }
  );
});

// GET /api/bookings/owner/all
router.get('/owner/all', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { status, date, venue_id, page = 1, limit = 20 } = req.query;
  let conditions = ['v.owner_id = ?'];
  let params = [req.user.id];
  if (req.user.role === 'admin') { conditions = []; params = []; }
  if (status) { conditions.push('b.status = ?'); params.push(status); }
  if (date) { conditions.push('ts.slot_date = ?'); params.push(date); }
  if (venue_id) { conditions.push('v.id = ?'); params.push(venue_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  db.query(`
    SELECT b.*, ts.slot_date, ts.start_time, ts.end_time,
      c.name as court_name, c.sport_type, v.name as venue_name, v.id as venue_id,
      u.name as user_name, u.phone as user_phone,
      p.status as payment_status, p.amount as payment_amount
    FROM bookings b
    JOIN time_slots ts ON ts.id = b.slot_id
    JOIN courts c ON c.id = b.court_id
    JOIN venues v ON v.id = c.venue_id
    JOIN users u ON u.id = b.user_id
    LEFT JOIN payments p ON p.booking_id = b.id
    ${where} ORDER BY b.booked_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error', error: err.message });
      res.json({ success: true, data: results });
    }
  );
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res) => {
  db.query(`
    SELECT b.*, ts.slot_date, ts.start_time, ts.end_time,
      c.name as court_name, c.sport_type, c.price_per_hour,
      v.name as venue_name, v.address, v.latitude, v.longitude, v.phone_contact, v.id as venue_id,
      (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as venue_image,
      p.status as payment_status, p.method as payment_method, p.amount as payment_amount,
      u.name as user_name, u.phone as user_phone
    FROM bookings b
    JOIN time_slots ts ON ts.id = b.slot_id
    JOIN courts c ON c.id = b.court_id
    JOIN venues v ON v.id = c.venue_id
    LEFT JOIN payments p ON p.booking_id = b.id
    JOIN users u ON u.id = b.user_id
    WHERE b.id = ?`, [req.params.id], async (err, results) => {
    if (err || !results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    const booking = results[0];

    if (booking.payment_amount && booking.booking_code) {
      const paymentQr = await buildVietQR(booking.payment_amount, booking.booking_code);
      booking.vietQRUrl = paymentQr.vietQRUrl;
      booking.qrImageBase64 = paymentQr.qrImageBase64;
      booking.bankInfo = paymentQr.bankInfo;
      booking.description = paymentQr.description;
    }
    res.json({ success: true, data: booking });
  });
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authenticate, (req, res) => {
  const { reason } = req.body;
  db.query('SELECT b.*, ts.id as ts_id FROM bookings b JOIN time_slots ts ON ts.id = b.slot_id WHERE b.id = ? AND b.user_id = ?',
    [req.params.id, req.user.id], (err, results) => {
    if (!results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    const booking = results[0];
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Không thể hủy ở trạng thái này' });
    }
    db.query('UPDATE bookings SET status = "cancelled", cancelled_at = NOW(), cancel_reason = ? WHERE id = ?',
      [reason || null, req.params.id], () => {
      db.query("UPDATE time_slots SET status = 'open' WHERE id = ?", [booking.ts_id], () => {});
      res.json({ success: true, message: 'Hủy đặt sân thành công' });
    });
  });
});

// PUT /api/bookings/:id/confirm (owner)
router.put('/:id/confirm', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const ownerClause = req.user.role === 'admin' ? '' : 'AND v.owner_id = ?';
  const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

  db.query(`
    SELECT b.id FROM bookings b
    JOIN courts c ON c.id = b.court_id
    JOIN venues v ON v.id = c.venue_id
    WHERE b.id = ? ${ownerClause}`,
    params, (findErr, rows) => {
    if (findErr) return res.status(500).json({ success: false, message: 'Lỗi' });
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuộc sân của bạn' });

    db.query("UPDATE bookings SET status = 'confirmed', confirmed_at = NOW() WHERE id = ?", [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
      db.query("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE booking_id = ?", [req.params.id], () => {});
      res.json({ success: true, message: 'Đã xác nhận đặt sân' });
    });
  });
});

// PUT /api/bookings/:id/complete (owner)
router.put('/:id/complete', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const ownerClause = req.user.role === 'admin' ? '' : 'AND v.owner_id = ?';
  const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

  db.query(`
    SELECT b.id FROM bookings b
    JOIN courts c ON c.id = b.court_id
    JOIN venues v ON v.id = c.venue_id
    WHERE b.id = ? ${ownerClause}`,
    params, (findErr, rows) => {
    if (findErr) return res.status(500).json({ success: false, message: 'Lỗi' });
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuộc sân của bạn' });

    db.query("UPDATE bookings SET status = 'completed' WHERE id = ?", [req.params.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
      res.json({ success: true, message: 'Đã hoàn thành' });
    });
  });
});

module.exports = router;
