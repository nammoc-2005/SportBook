const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');

// GET /api/reviews/venue/:venueId
router.get('/venue/:venueId', (req, res) => {
  const { page=1, limit=10 } = req.query;
  db.query(`
    SELECT r.*,u.name as user_name,u.avatar_url as user_avatar
    FROM reviews r JOIN users u ON u.id=r.user_id
    WHERE r.venue_id=? AND r.is_hidden=0
    ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [req.params.venueId, parseInt(limit), (parseInt(page)-1)*parseInt(limit)],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      res.json({ success: true, data: rows });
    });
});

// GET /api/reviews/my
router.get('/my', authenticate, (req, res) => {
  db.query(`
    SELECT r.*,v.name as venue_name,
      (SELECT image_url FROM venue_images WHERE venue_id=v.id AND is_cover=1 LIMIT 1) as venue_image
    FROM reviews r JOIN venues v ON v.id=r.venue_id
    WHERE r.user_id=? ORDER BY r.created_at DESC`, [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      res.json({ success: true, data: rows });
    });
});

// POST /api/reviews
router.post('/', authenticate, (req, res) => {
  const { venue_id, booking_id, rating, comment } = req.body;
  if (!venue_id || !booking_id || !rating) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
  if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating từ 1-5' });

  db.query("SELECT id FROM bookings WHERE id=? AND user_id=? AND status='completed'",
    [booking_id, req.user.id], (err, results) => {
    if (!results.length) return res.status(400).json({ success: false, message: 'Chỉ đánh giá sau khi hoàn thành đặt sân' });

    db.query('INSERT INTO reviews (user_id,venue_id,booking_id,rating,comment) VALUES (?,?,?,?,?)',
      [req.user.id, venue_id, booking_id, rating, comment||null], (err2, result) => {
        if (err2) {
          if (err2.code==='ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Bạn đã đánh giá rồi' });
          return res.status(500).json({ success: false, message: 'Gửi đánh giá thất bại' });
        }
        db.query('UPDATE venues SET avg_rating=(SELECT AVG(rating) FROM reviews WHERE venue_id=? AND is_hidden=0),total_reviews=(SELECT COUNT(*) FROM reviews WHERE venue_id=? AND is_hidden=0) WHERE id=?',
          [venue_id, venue_id, venue_id], () => {});
        db.query('UPDATE bookings SET is_reviewed=1 WHERE id=?', [booking_id], () => {});
        res.status(201).json({ success: true, message: 'Cảm ơn bạn đã đánh giá!', reviewId: result.insertId });
      });
  });
});

// PUT /api/reviews/:id - Sửa đánh giá (của chính mình, trong 24h)
router.put('/:id', authenticate, async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM reviews WHERE id=? AND user_id=? AND TIMESTAMPDIFF(HOUR,created_at,NOW())<24',
      [req.params.id, req.user.id]);
    if (!rows.length) return res.status(403).json({ success: false, message: 'Không thể sửa đánh giá này' });
    if (rating && (rating<1||rating>5)) return res.status(400).json({ success: false, message: 'Rating từ 1-5' });
    await db.query('UPDATE reviews SET rating=COALESCE(?,rating),comment=COALESCE(?,comment) WHERE id=?',
      [rating||null, comment||null, req.params.id]);
    await db.query('UPDATE venues SET avg_rating=(SELECT AVG(rating) FROM reviews WHERE venue_id=? AND is_hidden=0) WHERE id=?',
      [rows[0].venue_id, rows[0].venue_id]);
    res.json({ success: true, message: 'Đã cập nhật đánh giá' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/reviews/:id/owner-reply
router.put('/:id/owner-reply', authenticate, async (req, res) => {
  const { reply } = req.body;
  if (!reply) return res.status(400).json({ success: false, message: 'Thiếu nội dung phản hồi' });
  try {
    const [rows] = await db.query(`
      SELECT r.id FROM reviews r JOIN venues v ON v.id=r.venue_id
      WHERE r.id=? AND (v.owner_id=? OR ?='admin')`,
      [req.params.id, req.user.id, req.user.role]);
    if (!rows.length) return res.status(403).json({ success: false, message: 'Không có quyền' });
    await db.query('UPDATE reviews SET owner_reply=?,owner_reply_at=NOW() WHERE id=?', [reply, req.params.id]);
    res.json({ success: true, message: 'Đã phản hồi đánh giá' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
