const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/venues');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `venue_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function safeParseJSON(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

// GET /api/venues - Danh sách sân
router.get('/', (req, res) => {
  const { sport_type, city, search, lat, lng, page = 1, limit = 20, sort = 'rating' } = req.query;
  let conditions = ['v.is_active = 1'];
  let params = [];

  if (sport_type) { conditions.push('JSON_CONTAINS(v.sport_types, JSON_QUOTE(?))'); params.push(sport_type); }
  if (city) { conditions.push('v.address LIKE ?'); params.push(`%${city}%`); }
  if (search) { conditions.push('(v.name LIKE ? OR v.address LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let orderBy = 'v.avg_rating DESC, v.total_reviews DESC';
  
  // Haversine formula logic
  let distanceSelect = '';
  if (lat && lng) {
    distanceSelect = `, ( 6371 * acos( cos( radians(${parseFloat(lat)}) ) * cos( radians( v.latitude ) ) * cos( radians( v.longitude ) - radians(${parseFloat(lng)}) ) + sin( radians(${parseFloat(lat)}) ) * sin( radians( v.latitude ) ) ) ) AS distance`;
    if (sort === 'nearest') {
      orderBy = 'distance ASC';
    }
  } else {
    if (sort === 'price') orderBy = 'min_price ASC';
    if (sort === 'newest') orderBy = 'v.created_at DESC';
  }

  const countParams = [...params];
  const where = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT v.id, v.name, v.address, v.latitude, v.longitude, v.sport_types,
      v.open_time, v.close_time, v.phone_contact, v.avg_rating, v.total_reviews, v.is_active, v.created_at,
      MIN(c.price_per_hour) as min_price,
      (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as cover_image,
      u.name as owner_name${distanceSelect}
    FROM venues v
    LEFT JOIN courts c ON c.venue_id = v.id AND c.status = 'available'
    LEFT JOIN users u ON u.id = v.owner_id
    ${where}
    GROUP BY v.id ORDER BY ${orderBy} LIMIT ? OFFSET ?`;

  db.query(query, [...params, parseInt(limit), offset], (err, venues) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error', error: err.message });
    venues = venues.map(v => ({ ...v, sport_types: safeParseJSON(v.sport_types, []) }));

    db.query(`SELECT COUNT(DISTINCT v.id) as total FROM venues v ${where}`, countParams, (err2, countResult) => {
      const total = countResult?.[0]?.total || 0;
      res.json({ success: true, data: venues, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
    });
  });
});

// GET /api/venues/owner/my
router.get('/owner/my', authenticate, requireRole('owner', 'admin'), (req, res) => {
  db.query(`
    SELECT v.*, COUNT(DISTINCT c.id) as court_count,
      (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as cover_image
    FROM venues v LEFT JOIN courts c ON c.venue_id = v.id
    WHERE v.owner_id = ? GROUP BY v.id ORDER BY v.created_at DESC`,
    [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    results = results.map(v => ({ ...v, sport_types: safeParseJSON(v.sport_types, []) }));
    res.json({ success: true, data: results });
  });
});

// GET /api/venues/:id - Chi tiết sân
router.get('/:id', (req, res) => {
  db.query(`
    SELECT v.*, u.name as owner_name, u.phone as owner_phone,
      co.business_name, co.status as owner_status
    FROM venues v
    LEFT JOIN users u ON u.id = v.owner_id
    LEFT JOIN court_owners co ON co.user_id = v.owner_id
    WHERE v.id = ?`, [req.params.id], (err, results) => {
    if (err || !results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });

    const venue = results[0];
    venue.sport_types = safeParseJSON(venue.sport_types, []);

    db.query('SELECT * FROM venue_images WHERE venue_id = ? ORDER BY is_cover DESC, sort_order ASC', [venue.id], (err2, images) => {
      venue.images = images || [];
      db.query('SELECT * FROM courts WHERE venue_id = ? AND status = "available" ORDER BY sport_type, name', [venue.id], (err3, courts) => {
        venue.courts = courts || [];
        res.json({ success: true, data: venue });
      });
    });
  });
});

// GET /api/venues/:id/reviews
router.get('/:id/reviews', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  db.query(`
    SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.venue_id = ? AND r.is_hidden = 0 ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [req.params.id, parseInt(limit), (page - 1) * parseInt(limit)], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, data: results });
  });
});

// POST /api/venues
router.post('/', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { name, address, latitude, longitude, description, sport_types, open_time, close_time, phone_contact } = req.body;
  if (!name || !address) return res.status(400).json({ success: false, message: 'Tên và địa chỉ là bắt buộc' });

  db.query(`INSERT INTO venues (owner_id, name, address, latitude, longitude, description, sport_types, open_time, close_time, phone_contact, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, address, latitude || null, longitude || null, description || null,
      JSON.stringify(sport_types || []), open_time || '06:00:00', close_time || '22:00:00', phone_contact || null,
      req.user.role === 'admin' ? 1 : 0],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Tạo sân thất bại', error: err.message });
      res.status(201).json({ success: true, message: req.user.role === 'admin' ? 'Tạo sân thành công!' : 'Yêu cầu đã gửi. Chờ admin duyệt.', venueId: result.insertId });
    }
  );
});

// PUT /api/venues/:id
router.put('/:id', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { name, address, latitude, longitude, description, sport_types, open_time, close_time, phone_contact } = req.body;
  db.query('SELECT owner_id FROM venues WHERE id = ?', [req.params.id], (err, results) => {
    if (!results.length) return res.status(404).json({ success: false, message: 'Sân không tồn tại' });
    if (results[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }
    db.query(`UPDATE venues SET name=?, address=?, latitude=?, longitude=?, description=?, sport_types=?, open_time=?, close_time=?, phone_contact=? WHERE id=?`,
      [name, address, latitude, longitude, description, JSON.stringify(sport_types), open_time, close_time, phone_contact, req.params.id],
      (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Cập nhật thất bại' });
        res.json({ success: true, message: 'Cập nhật sân thành công' });
      }
    );
  });
});

// POST /api/venues/:id/images
router.post('/:id/images', authenticate, requireRole('owner', 'admin'), upload.array('images', 10), (req, res) => {
  const files = req.files;
  if (!files || !files.length) return res.status(400).json({ success: false, message: 'Không có file ảnh' });
  const values = files.map((f, i) => [req.params.id, `/uploads/venues/${f.filename}`, i === 0 ? 1 : 0, i]);
  db.query('INSERT INTO venue_images (venue_id, image_url, is_cover, sort_order) VALUES ?', [values], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Upload thất bại' });
    res.json({ success: true, urls: files.map(f => `/uploads/venues/${f.filename}`) });
  });
});

module.exports = router;
