const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

// All admin routes require auth + admin role
router.use(authenticate, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const queries = [
    ['totalUsers', 'SELECT COUNT(*) as v FROM users WHERE role = "user"'],
    ['totalOwners', 'SELECT COUNT(*) as v FROM users WHERE role = "owner"'],
    ['totalVenues', 'SELECT COUNT(*) as v FROM venues'],
    ['pendingVenues', 'SELECT COUNT(*) as v FROM venues WHERE is_active = 0'],
    ['totalBookings', 'SELECT COUNT(*) as v FROM bookings'],
    ['todayBookings', 'SELECT COUNT(*) as v FROM bookings WHERE DATE(booked_at) = CURDATE()'],
    ['totalRevenue', 'SELECT COALESCE(SUM(total_price), 0) as v FROM bookings WHERE status = "completed"'],
    ['monthRevenue', 'SELECT COALESCE(SUM(total_price), 0) as v FROM bookings WHERE status = "completed" AND MONTH(booked_at) = MONTH(CURDATE()) AND YEAR(booked_at) = YEAR(CURDATE())'],
  ];

  Promise.all(queries.map(([key, sql]) =>
    new Promise(resolve => db.query(sql, (err, r) => resolve({ key, val: r?.[0]?.v || 0 })))
  )).then(async (simpleStats) => {
    const stats = {};
    simpleStats.forEach(({ key, val }) => stats[key] = val);

    // Complex queries
    db.query(`SELECT b.*, u.name as user_name, v.name as venue_name, c.sport_type FROM bookings b JOIN users u ON u.id = b.user_id JOIN courts c ON c.id = b.court_id JOIN venues v ON v.id = c.venue_id ORDER BY b.booked_at DESC LIMIT 10`,
      (err, recentBookings) => {
      stats.recentBookings = recentBookings || [];

      db.query(`SELECT status, COUNT(*) as count FROM bookings GROUP BY status`, (err2, byStatus) => {
        stats.bookingByStatus = byStatus || [];

        db.query(`SELECT DATE_FORMAT(booked_at, '%Y-%m') as month, SUM(total_price) as revenue, COUNT(*) as bookings FROM bookings WHERE status = 'completed' AND booked_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY month`,
          (err3, revenueByMonth) => {
          stats.revenueByMonth = revenueByMonth || [];
          res.json({ success: true, data: stats });
        });
      });
    });
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  let conditions = [];
  let params = [];
  if (role) { conditions.push('u.role = ?'); params.push(role); }
  if (search) { conditions.push('(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  db.query(`
    SELECT u.*, co.business_name, co.status as owner_status, COUNT(DISTINCT b.id) as total_bookings
    FROM users u
    LEFT JOIN court_owners co ON co.user_id = u.id
    LEFT JOIN bookings b ON b.user_id = u.id
    ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, data: results });
  });
});

// PUT /api/admin/users/:id/toggle - Khoá/mở tài khoản (dùng is_verified làm cờ active)
router.put('/users/:id/toggle', (req, res) => {
  // Note: actual schema has is_verified, not is_active. We use role = 'banned' or keep as is.
  // Using a different approach - update role to 'banned' or restore original role
  db.query('SELECT role FROM users WHERE id = ?', [req.params.id], (err, results) => {
    if (!results.length) return res.status(404).json({ success: false, message: 'User không tồn tại' });
    const currentRole = results[0].role;
    const newRole = currentRole === 'banned' ? 'user' : 'banned';
    db.query('UPDATE users SET role = ? WHERE id = ?', [newRole, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Lỗi' });
      res.json({ success: true, message: newRole === 'banned' ? 'Đã khoá tài khoản' : 'Đã mở tài khoản', role: newRole });
    });
  });
});

// GET /api/admin/venues
router.get('/venues', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let conditions = [];
  let params = [];
  if (status === 'pending') { conditions.push('v.is_active = 0'); }
  else if (status === 'approved') { conditions.push('v.is_active = 1'); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  db.query(`
    SELECT v.*, u.name as owner_name, u.phone as owner_phone, co.status as owner_status,
      COUNT(DISTINCT c.id) as court_count,
      (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = 1 LIMIT 1) as cover_image
    FROM venues v
    JOIN users u ON u.id = v.owner_id
    LEFT JOIN court_owners co ON co.user_id = v.owner_id
    LEFT JOIN courts c ON c.venue_id = v.id
    ${where} GROUP BY v.id ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    results = results.map(v => ({ ...v, sport_types: safeJSON(v.sport_types, []) }));
    res.json({ success: true, data: results });
  });
});

// PUT /api/admin/venues/:id/approve
router.put('/venues/:id/approve', (req, res) => {
  db.query('UPDATE venues SET is_active = 1 WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    db.query(`INSERT INTO notifications (user_id, type, title, message)
      SELECT owner_id, 'system', '✅ Sân đã được duyệt', CONCAT('Sân "', name, '" đã được duyệt!') FROM venues WHERE id = ?`,
      [req.params.id], () => {});
    res.json({ success: true, message: 'Đã duyệt sân' });
  });
});

// PUT /api/admin/venues/:id/reject
router.put('/venues/:id/reject', (req, res) => {
  const { reason } = req.body;
  db.query('DELETE FROM venues WHERE id = ? AND is_active = 0', [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, message: 'Đã từ chối và xoá yêu cầu sân' });
  });
});

// GET /api/admin/bookings
router.get('/bookings', (req, res) => {
  const { status, date, page = 1, limit = 20 } = req.query;
  let conditions = [];
  let params = [];
  if (status) { conditions.push('b.status = ?'); params.push(status); }
  if (date) { conditions.push('ts.slot_date = ?'); params.push(date); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  db.query(`
    SELECT b.*, ts.slot_date, ts.start_time, ts.end_time,
      c.name as court_name, c.sport_type,
      v.name as venue_name, u.name as user_name, u.phone as user_phone,
      p.status as payment_status, p.amount as payment_amount
    FROM bookings b
    JOIN time_slots ts ON ts.id = b.slot_id
    JOIN courts c ON c.id = b.court_id
    JOIN venues v ON v.id = c.venue_id
    JOIN users u ON u.id = b.user_id
    LEFT JOIN payments p ON p.booking_id = b.id
    ${where} ORDER BY b.booked_at DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, data: results });
  });
});

// PUT /api/admin/owners/:id/verify
router.put('/owners/:id/verify', (req, res) => {
  db.query("UPDATE court_owners SET status = 'approved' WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
    res.json({ success: true, message: 'Đã xác minh chủ sân' });
  });
});

function safeJSON(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

module.exports = router;
