const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { getPaymentConfig, savePaymentConfig, getBankList, getBankInfo } = require('../utils/paymentConfig');

router.use(authenticate, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [[users]] = await db.query('SELECT COUNT(*) as v FROM users WHERE role="user"');
    const [[owners]] = await db.query('SELECT COUNT(*) as v FROM users WHERE role="owner"');
    const [[venues]] = await db.query('SELECT COUNT(*) as v FROM venues');
    const [[pendingVenues]] = await db.query('SELECT COUNT(*) as v FROM venues WHERE is_active=0');
    const [[bookings]] = await db.query('SELECT COUNT(*) as v FROM bookings');
    const [[todayBookings]] = await db.query('SELECT COUNT(*) as v FROM bookings WHERE DATE(booked_at)=CURDATE()');
    const [[revenue]] = await db.query('SELECT COALESCE(SUM(total_price),0) as v FROM bookings WHERE status="completed"');
    const [[monthRevenue]] = await db.query('SELECT COALESCE(SUM(total_price),0) as v FROM bookings WHERE status="completed" AND MONTH(booked_at)=MONTH(CURDATE()) AND YEAR(booked_at)=YEAR(CURDATE())');
    const [recentBookings] = await db.query(`
      SELECT b.*, ts.slot_date, ts.start_time, ts.end_time,
        c.name as court_name, v.name as venue_name, u.name as user_name
      FROM bookings b
      JOIN time_slots ts ON ts.id=b.slot_id
      JOIN courts c ON c.id=b.court_id
      JOIN venues v ON v.id=c.venue_id
      JOIN users u ON u.id=b.user_id
      ORDER BY b.booked_at DESC LIMIT 10`);
    const [bookingByStatus] = await db.query('SELECT status, COUNT(*) as count FROM bookings GROUP BY status');
    const [revenueByMonth] = await db.query(`
      SELECT DATE_FORMAT(booked_at,'%Y-%m') as month, SUM(total_price) as revenue, COUNT(*) as bookings
      FROM bookings WHERE status='completed' AND booked_at>=DATE_SUB(NOW(),INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month`);
    res.json({ success: true, data: {
      totalUsers: users.v, totalOwners: owners.v, totalVenues: venues.v,
      pendingVenues: pendingVenues.v, totalBookings: bookings.v,
      todayBookings: todayBookings.v, totalRevenue: revenue.v, monthRevenue: monthRevenue.v,
      recentBookings, bookingByStatus, revenueByMonth
    }});
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const { role, search, page=1, limit=20 } = req.query;
  let cond = ['1=1'], params = [];
  if (role) { cond.push('u.role=?'); params.push(role); }
  if (search) { cond.push('(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.username LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  try {
    const [rows] = await db.query(`
      SELECT u.id,u.username,u.name,u.email,u.phone,u.role,u.avatar_url,u.created_at,u.phone_verified,u.email_verified,
        co.business_name, co.status as owner_status,
        COUNT(DISTINCT b.id) as total_bookings
      FROM users u
      LEFT JOIN court_owners co ON co.user_id=u.id
      LEFT JOIN bookings b ON b.user_id=u.id
      WHERE ${cond.join(' AND ')}
      GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    const [[{total}]] = await db.query(`SELECT COUNT(DISTINCT u.id) as total FROM users u WHERE ${cond.join(' AND ')}`, params);
    res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.*,co.business_name,co.bank_account,co.bank_name,co.status as owner_status,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.status='completed' THEN b.total_price END),0) as total_spent
      FROM users u
      LEFT JOIN court_owners co ON co.user_id=u.id
      LEFT JOIN bookings b ON b.user_id=u.id
      WHERE u.id=? GROUP BY u.id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: rows[0] });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User không tồn tại' });
    if (rows[0].role === 'admin') return res.status(400).json({ success: false, message: 'Không thể khóa admin' });
    const newRole = rows[0].role === 'banned' ? 'user' : 'banned';
    await db.query('UPDATE users SET role=? WHERE id=?', [newRole, req.params.id]);
    res.json({ success: true, message: newRole==='banned'?'Đã khóa tài khoản':'Đã mở tài khoản', role: newRole });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user','owner','admin','banned'].includes(role)) return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
  try {
    await db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
    if (role === 'owner') {
      await db.query(`INSERT IGNORE INTO court_owners (user_id,business_name,status) SELECT id,name,'pending' FROM users WHERE id=?`, [req.params.id]);
    }
    res.json({ success: true, message: 'Đã cập nhật role', role });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (rows[0].role === 'admin') return res.status(400).json({ success: false, message: 'Không thể xóa admin' });
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa tài khoản' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/owners
router.get('/owners', async (req, res) => {
  const { status, page=1, limit=50 } = req.query;
  let cond = ['u.role="owner"'], params = [];
  if (status) { cond.push('co.status=?'); params.push(status); }
  try {
    const [rows] = await db.query(`
      SELECT co.*,u.name,u.username,u.phone,u.email,
        COUNT(DISTINCT v.id) as venue_count, COUNT(DISTINCT b.id) as booking_count
      FROM users u
      LEFT JOIN court_owners co ON co.user_id=u.id
      LEFT JOIN venues v ON v.owner_id=u.id
      LEFT JOIN courts c ON c.venue_id=v.id
      LEFT JOIN bookings b ON b.court_id=c.id
      WHERE ${cond.join(' AND ')}
      GROUP BY u.id,co.id ORDER BY co.created_at DESC,u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/owners/:id/verify
router.put('/owners/:id/verify', async (req, res) => {
  try {
    await db.query("UPDATE court_owners SET status='approved' WHERE id=?", [req.params.id]);
    const [rows] = await db.query('SELECT user_id FROM court_owners WHERE id=?', [req.params.id]);
    if (rows.length) {
      await db.query("INSERT INTO notifications (user_id,type,title,message) VALUES (?,'system','✅ Hồ sơ được duyệt','Hồ sơ chủ sân của bạn đã được xác minh!')", [rows[0].user_id]);
    }
    res.json({ success: true, message: 'Đã xác minh chủ sân' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/owners/:id/reject
router.put('/owners/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    await db.query("UPDATE court_owners SET status='rejected' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: 'Đã từ chối chủ sân' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/venues
router.get('/venues', async (req, res) => {
  const { status, search, page=1, limit=20 } = req.query;
  let cond = [], params = [];
  if (status==='pending') cond.push('v.is_active=0');
  else if (status==='approved') cond.push('v.is_active=1');
  if (search) { cond.push('(v.name LIKE ? OR v.address LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  try {
    const [rows] = await db.query(`
      SELECT v.*,u.name as owner_name,u.phone as owner_phone,co.status as owner_status,
        COUNT(DISTINCT c.id) as court_count,
        (SELECT image_url FROM venue_images WHERE venue_id=v.id AND is_cover=1 LIMIT 1) as cover_image
      FROM venues v JOIN users u ON u.id=v.owner_id
      LEFT JOIN court_owners co ON co.user_id=v.owner_id
      LEFT JOIN courts c ON c.venue_id=v.id
      ${where} GROUP BY v.id ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    rows.forEach(v => { try { v.sport_types = v.sport_types ? JSON.parse(v.sport_types) : []; } catch { v.sport_types = []; } });
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/venues/:id/approve
router.put('/venues/:id/approve', async (req, res) => {
  try {
    await db.query('UPDATE venues SET is_active=1 WHERE id=?', [req.params.id]);
    await db.query(`INSERT INTO notifications (user_id,type,title,message)
      SELECT owner_id,'system','✅ Sân đã được duyệt',CONCAT('Sân "',name,'" đã được duyệt và hiển thị!')
      FROM venues WHERE id=?`, [req.params.id]);
    res.json({ success: true, message: 'Đã duyệt sân' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/venues/:id/reject
router.put('/venues/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    const [rows] = await db.query('SELECT owner_id,name FROM venues WHERE id=? AND is_active=0', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hoặc sân đã duyệt' });
    await db.query(`INSERT INTO notifications (user_id,type,title,message) VALUES (?,'system','❌ Sân bị từ chối',?)`,
      [rows[0].owner_id, `Sân "${rows[0].name}" bị từ chối${reason?' - Lý do: '+reason:''}.`]);
    await db.query('DELETE FROM venues WHERE id=? AND is_active=0', [req.params.id]);
    res.json({ success: true, message: 'Đã từ chối và xóa yêu cầu' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// DELETE /api/admin/venues/:id (force delete)
router.delete('/venues/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM venues WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa sân' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
  const { status, date, venue_id, page=1, limit=20 } = req.query;
  let cond = [], params = [];
  if (status) { cond.push('b.status=?'); params.push(status); }
  if (date) { cond.push('ts.slot_date=?'); params.push(date); }
  if (venue_id) { cond.push('v.id=?'); params.push(venue_id); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  try {
    const [rows] = await db.query(`
      SELECT b.*,ts.slot_date,ts.start_time,ts.end_time,
        c.name as court_name,c.sport_type,
        v.name as venue_name,u.name as user_name,u.phone as user_phone,
        p.status as payment_status,p.amount as payment_amount
      FROM bookings b
      JOIN time_slots ts ON ts.id=b.slot_id
      JOIN courts c ON c.id=b.court_id
      JOIN venues v ON v.id=c.venue_id
      JOIN users u ON u.id=b.user_id
      LEFT JOIN payments p ON p.booking_id=b.id
      ${where} ORDER BY b.booked_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/bookings/:id/status
router.put('/bookings/:id/status', async (req, res) => {
  const { status, cancel_reason } = req.body;
  if (!['pending','confirmed','completed','cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
  }
  try {
    const fields = ['status=?'];
    const params = [status];
    if (status==='confirmed') fields.push('confirmed_at=COALESCE(confirmed_at,NOW())');
    if (status==='cancelled') { fields.push('cancelled_at=COALESCE(cancelled_at,NOW())','cancel_reason=?'); params.push(cancel_reason||'Admin cập nhật'); }
    params.push(req.params.id);
    await db.query(`UPDATE bookings SET ${fields.join(',')} WHERE id=?`, params);
    if (status==='confirmed') await db.query("UPDATE payments SET status='paid',paid_at=COALESCE(paid_at,NOW()) WHERE booking_id=?", [req.params.id]);
    if (status==='cancelled') await db.query("UPDATE time_slots ts JOIN bookings b ON b.slot_id=ts.id SET ts.status='open' WHERE b.id=?", [req.params.id]);
    res.json({ success: true, message: 'Đã cập nhật trạng thái' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/payments
router.get('/payments', async (req, res) => {
  const { status, page=1, limit=50 } = req.query;
  let cond = [], params = [];
  if (status) { cond.push('p.status=?'); params.push(status); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  try {
    const [rows] = await db.query(`
      SELECT p.*,b.booking_code,b.status as booking_status,
        u.name as user_name,u.phone as user_phone,v.name as venue_name
      FROM payments p JOIN bookings b ON b.id=p.booking_id
      JOIN users u ON u.id=b.user_id JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id
      ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/reviews
router.get('/reviews', async (req, res) => {
  const { venue_id, is_hidden=null, page=1, limit=20 } = req.query;
  let cond = [], params = [];
  if (venue_id) { cond.push('r.venue_id=?'); params.push(venue_id); }
  if (is_hidden !== null) { cond.push('r.is_hidden=?'); params.push(parseInt(is_hidden)); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  try {
    const [rows] = await db.query(`
      SELECT r.*,v.name as venue_name,u.name as user_name,u.avatar_url as user_avatar
      FROM reviews r JOIN venues v ON v.id=r.venue_id JOIN users u ON u.id=r.user_id
      ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (parseInt(page)-1)*parseInt(limit)]);
    res.json({ success: true, data: rows });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/reviews/:id/hide
router.put('/reviews/:id/hide', async (req, res) => {
  const { is_hidden } = req.body;
  try {
    await db.query('UPDATE reviews SET is_hidden=? WHERE id=?', [is_hidden?1:0, req.params.id]);
    const [r] = await db.query('SELECT venue_id FROM reviews WHERE id=?', [req.params.id]);
    if (r.length) {
      await db.query('UPDATE venues SET avg_rating=(SELECT AVG(rating) FROM reviews WHERE venue_id=? AND is_hidden=0), total_reviews=(SELECT COUNT(*) FROM reviews WHERE venue_id=? AND is_hidden=0) WHERE id=?',
        [r[0].venue_id, r[0].venue_id, r[0].venue_id]);
    }
    res.json({ success: true, message: is_hidden?'Đã ẩn đánh giá':'Đã hiện đánh giá' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req, res) => {
  try {
    const [r] = await db.query('SELECT venue_id FROM reviews WHERE id=?', [req.params.id]);
    await db.query('DELETE FROM reviews WHERE id=?', [req.params.id]);
    if (r.length) {
      await db.query('UPDATE venues SET avg_rating=(SELECT COALESCE(AVG(rating),0) FROM reviews WHERE venue_id=? AND is_hidden=0), total_reviews=(SELECT COUNT(*) FROM reviews WHERE venue_id=? AND is_hidden=0) WHERE id=?',
        [r[0].venue_id, r[0].venue_id, r[0].venue_id]);
    }
    res.json({ success: true, message: 'Đã xóa đánh giá' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// POST /api/admin/notifications/broadcast
router.post('/notifications/broadcast', async (req, res) => {
  const { title, message, type='system', role } = req.body;
  if (!title || !message) return res.status(400).json({ success: false, message: 'Thiếu title hoặc message' });
  try {
    let userQuery = 'SELECT id FROM users WHERE role != "banned"';
    let params = [];
    if (role) { userQuery += ' AND role=?'; params.push(role); }
    const [users] = await db.query(userQuery, params);
    if (!users.length) return res.json({ success: true, message: 'Không có user phù hợp', count: 0 });
    const values = users.map(u => [u.id, null, type, title, message]);
    await db.query('INSERT INTO notifications (user_id,booking_id,type,title,message) VALUES ?', [values]);
    res.json({ success: true, message: `Đã gửi thông báo đến ${users.length} người dùng`, count: users.length });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/revenue
router.get('/revenue', async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  try {
    const [monthly] = await db.query(`
      SELECT DATE_FORMAT(booked_at,'%Y-%m') as month,
        COUNT(*) as bookings, SUM(total_price) as revenue, SUM(discount_amt) as discounts
      FROM bookings WHERE status='completed' AND YEAR(booked_at)=?
      GROUP BY month ORDER BY month`, [year]);
    const [byVenue] = await db.query(`
      SELECT v.name as venue_name, COUNT(*) as bookings, SUM(b.total_price) as revenue
      FROM bookings b JOIN courts c ON c.id=b.court_id JOIN venues v ON v.id=c.venue_id
      WHERE b.status='completed' AND YEAR(b.booked_at)=?
      GROUP BY v.id ORDER BY revenue DESC LIMIT 10`, [year]);
    const [bySport] = await db.query(`
      SELECT c.sport_type, COUNT(*) as bookings, SUM(b.total_price) as revenue
      FROM bookings b JOIN courts c ON c.id=b.court_id
      WHERE b.status='completed' AND YEAR(b.booked_at)=?
      GROUP BY c.sport_type`, [year]);
    res.json({ success: true, data: { monthly, byVenue, bySport } });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// GET /api/admin/banks — danh sách ngân hàng hỗ trợ VietQR
router.get('/banks', (req, res) => {
  res.json({ success: true, data: getBankList() });
});

// GET /api/admin/payment-settings
router.get('/payment-settings', async (req, res) => {
  const config = await getPaymentConfig();
  res.json({ success: true, data: {
    ...config,
    bankInfo: getBankInfo(config.bankId),
  }});
});

// PUT /api/admin/payment-settings
router.put('/payment-settings', async (req, res) => {
  try {
    const config = await savePaymentConfig(req.body);
    res.json({ success: true, message: 'Đã lưu cấu hình thanh toán', data: config });
  } catch(err) {
    res.status(err.status||500).json({ success: false, message: err.message||'Lỗi' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM app_settings ORDER BY setting_key');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, data: settings });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  const entries = Object.entries(req.body).filter(([k,v]) => k && v !== undefined);
  if (!entries.length) return res.status(400).json({ success: false, message: 'Không có dữ liệu' });
  try {
    const values = entries.map(([k,v]) => [k, String(v)]);
    await db.query(`INSERT INTO app_settings (setting_key,setting_value) VALUES ?
      ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_at=CURRENT_TIMESTAMP`, [values]);
    res.json({ success: true, message: 'Đã lưu cài đặt' });
  } catch(err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
