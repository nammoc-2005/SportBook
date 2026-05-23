const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.use(authenticate, requireRole('owner', 'admin'));

// GET /api/owner/stats
router.get('/stats', async (req, res) => {
  const ownerId = req.user.id;
  try {
    const [[venueCount]] = await db.query('SELECT COUNT(*) as v FROM venues WHERE owner_id=?', [ownerId]);
    const [[courtCount]] = await db.query('SELECT COUNT(*) as v FROM courts c JOIN venues v ON v.id=c.venue_id WHERE v.owner_id=?', [ownerId]);
    const [[bookingCount]] = await db.query('SELECT COUNT(*) as v FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id WHERE v.owner_id=?', [ownerId]);
    const [[pendingCount]] = await db.query('SELECT COUNT(*) as v FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id WHERE v.owner_id=? AND b.status="pending"', [ownerId]);
    const [[revenue]] = await db.query('SELECT COALESCE(SUM(b.total_price),0) as v FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id WHERE v.owner_id=? AND b.status="completed"', [ownerId]);
    const [[monthRevenue]] = await db.query('SELECT COALESCE(SUM(b.total_price),0) as v FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id WHERE v.owner_id=? AND b.status="completed" AND MONTH(b.booked_at)=MONTH(CURDATE()) AND YEAR(b.booked_at)=YEAR(CURDATE())', [ownerId]);
    const [recentBookings] = await db.query(`
      SELECT b.*, ts.slot_date, ts.start_time, ts.end_time,
        c.name as court_name, v.name as venue_name,
        u.name as user_name, u.phone as user_phone
      FROM bookings b
      JOIN time_slots ts ON ts.id=b.slot_id
      JOIN courts c ON c.id=b.court_id
      JOIN venues v ON v.id=c.venue_id
      JOIN users u ON u.id=b.user_id
      WHERE v.owner_id=? ORDER BY b.booked_at DESC LIMIT 10`, [ownerId]);
    const [revenueByMonth] = await db.query(`
      SELECT DATE_FORMAT(b.booked_at,'%Y-%m') as month,
        SUM(b.total_price) as revenue, COUNT(*) as bookings
      FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id
      WHERE v.owner_id=? AND b.status='completed' AND b.booked_at>=DATE_SUB(NOW(),INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month`, [ownerId]);
    res.json({ success: true, data: {
      venueCount: venueCount.v, courtCount: courtCount.v,
      bookingCount: bookingCount.v, pendingCount: pendingCount.v,
      totalRevenue: revenue.v, monthRevenue: monthRevenue.v,
      recentBookings, revenueByMonth
    }});
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/owner/revenue?year=2025
router.get('/revenue', async (req, res) => {
  const { year = new Date().getFullYear(), venue_id } = req.query;
  let cond = 'v.owner_id=?';
  let params = [req.user.id];
  if (venue_id) { cond += ' AND v.id=?'; params.push(venue_id); }
  try {
    const [monthly] = await db.query(`
      SELECT DATE_FORMAT(b.booked_at,'%Y-%m') as month,
        COUNT(*) as bookings, SUM(b.total_price) as revenue,
        SUM(b.discount_amt) as discounts
      FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id
      WHERE ${cond} AND b.status='completed' AND YEAR(b.booked_at)=?
      GROUP BY month ORDER BY month`, [...params, year]);
    const [bySport] = await db.query(`
      SELECT c.sport_type, COUNT(*) as bookings, SUM(b.total_price) as revenue
      FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id
      WHERE ${cond} AND b.status='completed' AND YEAR(b.booked_at)=?
      GROUP BY c.sport_type`, [...params, year]);
    res.json({ success: true, data: { monthly, bySport } });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/owner/reviews
router.get('/reviews', async (req, res) => {
  const { venue_id, page=1, limit=20 } = req.query;
  let cond = 'v.owner_id=?';
  let params = [req.user.id];
  if (venue_id) { cond += ' AND v.id=?'; params.push(venue_id); }
  try {
    const [rows] = await db.query(`
      SELECT r.*, v.name as venue_name, u.name as user_name, u.avatar_url as user_avatar
      FROM reviews r JOIN venues v ON v.id=r.venue_id JOIN users u ON u.id=r.user_id
      WHERE ${cond} AND r.is_hidden=0
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/owner/promotions
router.get('/promotions', async (req, res) => {
  const { venue_id } = req.query;
  let cond = 'v.owner_id=?';
  let params = [req.user.id];
  if (venue_id) { cond += ' AND p.venue_id=?'; params.push(venue_id); }
  try {
    const [rows] = await db.query(`
      SELECT p.*, v.name as venue_name FROM promotions p
      JOIN venues v ON v.id=p.venue_id
      WHERE ${cond} ORDER BY p.created_at DESC`, params);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/owner/promotions/:id
router.put('/promotions/:id', async (req, res) => {
  const { discount_pct, discount_amt, min_booking, usage_limit, start_date, end_date, is_active } = req.body;
  try {
    const [rows] = await db.query('SELECT p.* FROM promotions p JOIN venues v ON v.id=p.venue_id WHERE p.id=? AND v.owner_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    await db.query('UPDATE promotions SET discount_pct=?,discount_amt=?,min_booking=?,usage_limit=?,start_date=?,end_date=?,is_active=? WHERE id=?',
      [discount_pct??rows[0].discount_pct, discount_amt??rows[0].discount_amt, min_booking??rows[0].min_booking,
       usage_limit??rows[0].usage_limit, start_date??rows[0].start_date, end_date??rows[0].end_date,
       is_active??rows[0].is_active, req.params.id]);
    res.json({ success: true, message: 'Cập nhật mã giảm giá thành công' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// DELETE /api/owner/promotions/:id
router.delete('/promotions/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT p.id FROM promotions p JOIN venues v ON v.id=p.venue_id WHERE p.id=? AND v.owner_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    await db.query('DELETE FROM promotions WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa mã giảm giá' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/owner/profile
router.put('/profile', async (req, res) => {
  const { business_name, bank_account, bank_name, description, phone_contact } = req.body;
  try {
    await db.query(`INSERT INTO court_owners (user_id, business_name, bank_account, bank_name, status)
      VALUES (?,?,?,?,'pending')
      ON DUPLICATE KEY UPDATE business_name=COALESCE(?,business_name), bank_account=COALESCE(?,bank_account), bank_name=COALESCE(?,bank_name)`,
      [req.user.id, business_name||null, bank_account||null, bank_name||null,
       business_name||null, bank_account||null, bank_name||null]);
    res.json({ success: true, message: 'Cập nhật hồ sơ chủ sân thành công' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// DELETE /api/owner/venues/:id
router.delete('/venues/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM venues WHERE id=? AND owner_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hoặc không có quyền' });
    const [active] = await db.query("SELECT COUNT(*) as c FROM bookings b JOIN courts c ON c.id=b.court_id WHERE c.venue_id=? AND b.status IN ('pending','confirmed')", [req.params.id]);
    if (active[0].c > 0) return res.status(400).json({ success: false, message: 'Không thể xóa sân đang có booking đang xử lý' });
    await db.query('DELETE FROM venues WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa sân' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
