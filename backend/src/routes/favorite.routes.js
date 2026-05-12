const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');

// POST /api/favorites/:venueId - Toggle favorite
router.post('/:venueId', authenticate, (req, res) => {
  const venueId = req.params.venueId;
  const userId = req.user.id;

  db.query('SELECT * FROM user_favorites WHERE user_id = ? AND venue_id = ?', [userId, venueId], (err, results) => {
    if (results.length > 0) {
      // Already favorited, so remove it
      db.query('DELETE FROM user_favorites WHERE user_id = ? AND venue_id = ?', [userId, venueId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Lỗi server' });
        res.json({ success: true, message: 'Đã bỏ yêu thích', isFavorite: false });
      });
    } else {
      // Add to favorites
      db.query('INSERT INTO user_favorites (user_id, venue_id) VALUES (?, ?)', [userId, venueId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Lỗi server' });
        res.json({ success: true, message: 'Đã thêm vào yêu thích', isFavorite: true });
      });
    }
  });
});

// GET /api/favorites - List my favorites
router.get('/', authenticate, (req, res) => {
  db.query(`
    SELECT v.*, 
      (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as cover_image
    FROM venues v
    JOIN user_favorites f ON f.venue_id = v.id
    WHERE f.user_id = ?`, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi server' });
    res.json({ success: true, data: results });
  });
});

// GET /api/favorites/check/:venueId - Check if favorited
router.get('/check/:venueId', authenticate, (req, res) => {
  db.query('SELECT * FROM user_favorites WHERE user_id = ? AND venue_id = ?', [req.user.id, req.params.venueId], (err, results) => {
    res.json({ success: true, isFavorite: results.length > 0 });
  });
});

module.exports = router;
