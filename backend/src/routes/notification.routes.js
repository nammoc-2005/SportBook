const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');

// GET /api/notifications
router.get('/', authenticate, (req, res) => {
  const { page=1, limit=20 } = req.query;
  db.query('SELECT * FROM notifications WHERE user_id=? ORDER BY sent_at DESC LIMIT ? OFFSET ?',
    [req.user.id, parseInt(limit), (parseInt(page)-1)*parseInt(limit)],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      res.json({ success: true, data: rows });
    });
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, (req, res) => {
  db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, count: rows[0].count });
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, (req, res) => {
  db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true });
  });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, (req, res) => {
  db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, message: 'Đã đọc tất cả' });
  });
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, (req, res) => {
  db.query('DELETE FROM notifications WHERE id=? AND user_id=?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, message: 'Đã xóa thông báo' });
  });
});

// DELETE /api/notifications/clear-all
router.delete('/clear-all', authenticate, (req, res) => {
  db.query('DELETE FROM notifications WHERE user_id=? AND is_read=1', [req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, message: 'Đã xóa thông báo đã đọc' });
  });
});

// POST /api/notifications/push-token - Lưu Expo push token
router.post('/push-token', authenticate, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Thiếu token' });
  try {
    await db.query(`INSERT INTO user_push_tokens (user_id,token,platform,created_at)
      VALUES (?,?,?,NOW()) ON DUPLICATE KEY UPDATE token=VALUES(token),updated_at=NOW()`,
      [req.user.id, token, platform||'unknown']);
    res.json({ success: true, message: 'Đã lưu push token' });
  } catch(err) {
    // Nếu bảng chưa tồn tại thì bỏ qua
    res.json({ success: true, message: 'Push token noted' });
  }
});

module.exports = router;
