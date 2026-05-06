const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');

// GET /api/notifications
router.get('/', authenticate, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?',
    [req.user.id, parseInt(limit), (parseInt(page)-1)*parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      res.json({ success: true, data: results });
    }
  );
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, (req, res) => {
  db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, count: results[0].count });
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, (req, res) => {
  db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true });
  });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, (req, res) => {
  db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, message: 'Đã đọc tất cả' });
  });
});

module.exports = router;
