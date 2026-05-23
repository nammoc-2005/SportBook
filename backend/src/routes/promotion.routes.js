const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

// GET /api/promotions/:code/validate?venue_id=X
router.get('/:code/validate', authenticate, (req, res) => {
  const { venue_id } = req.query;
  db.query(`SELECT * FROM promotions WHERE code=? AND venue_id=? AND is_active=1
    AND CURDATE() BETWEEN start_date AND end_date AND used_count<usage_limit`,
    [req.params.code, venue_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (!results.length) return res.status(404).json({ success: false, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
    res.json({ success: true, promo: results[0] });
  });
});

// GET /api/promotions/venue/:venueId
router.get('/venue/:venueId', (req, res) => {
  db.query(`SELECT * FROM promotions WHERE venue_id=? AND is_active=1
    AND CURDATE() BETWEEN start_date AND end_date AND used_count<usage_limit`,
    [req.params.venueId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, data: results });
  });
});

// POST /api/promotions
router.post('/', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { code, venue_id, discount_pct, discount_amt, min_booking, usage_limit, start_date, end_date, description } = req.body;
  if (!code || !venue_id || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  db.query(`INSERT INTO promotions (venue_id,code,discount_pct,discount_amt,min_booking,usage_limit,start_date,end_date,is_active)
    VALUES (?,?,?,?,?,?,?,?,1)`,
    [venue_id, code.toUpperCase(), discount_pct||0, discount_amt||0, min_booking||0, usage_limit||100, start_date, end_date],
    (err, result) => {
      if (err) {
        if (err.code==='ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Mã đã tồn tại' });
        return res.status(500).json({ success: false, message: 'Tạo thất bại' });
      }
      res.status(201).json({ success: true, message: 'Tạo mã giảm giá thành công', promoId: result.insertId });
    });
});

// PUT /api/promotions/:id
router.put('/:id', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  const { discount_pct, discount_amt, min_booking, usage_limit, start_date, end_date, is_active } = req.body;
  try {
    const [rows] = await db.query('SELECT p.* FROM promotions p JOIN venues v ON v.id=p.venue_id WHERE p.id=? AND (v.owner_id=? OR ?="admin")',
      [req.params.id, req.user.id, req.user.role]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hoặc không có quyền' });
    const p = rows[0];
    await db.query('UPDATE promotions SET discount_pct=?,discount_amt=?,min_booking=?,usage_limit=?,start_date=?,end_date=?,is_active=? WHERE id=?',
      [discount_pct??p.discount_pct, discount_amt??p.discount_amt, min_booking??p.min_booking,
       usage_limit??p.usage_limit, start_date??p.start_date, end_date??p.end_date,
       is_active!==undefined?is_active:p.is_active, req.params.id]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// DELETE /api/promotions/:id
router.delete('/:id', authenticate, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT p.id FROM promotions p JOIN venues v ON v.id=p.venue_id WHERE p.id=? AND (v.owner_id=? OR ?="admin")',
      [req.params.id, req.user.id, req.user.role]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hoặc không có quyền' });
    await db.query('DELETE FROM promotions WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa mã giảm giá' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
