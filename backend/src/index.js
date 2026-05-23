require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('./middlewares/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Global rate limit: 300 req / min / IP
app.use(rateLimit({ windowMs: 60_000, max: 300 }));

// Stricter limit cho auth routes (chống brute-force)
app.use('/api/auth/login',    rateLimit({ windowMs: 15 * 60_000, max: 15, message: 'Quá nhiều lần đăng nhập, thử lại sau 15 phút.' }));
app.use('/api/auth/send-otp', rateLimit({ windowMs: 60_000, max: 5, message: 'Quá nhiều yêu cầu OTP.' }));

// ── Test DB connection ────────────────────────────────────────────────────────
const db = require('./config/db');
(async () => {
  try {
    const conn = await db.getConnection();
    console.log('✅ Database connected successfully!');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   → Kiểm tra MySQL đang chạy và file .env (DB_HOST, DB_NAME, DB_USER)');
  }
})();

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/venues',        require('./routes/venue.routes'));
app.use('/api/courts',        require('./routes/court.routes'));
app.use('/api/bookings',      require('./routes/booking.routes'));
app.use('/api/payments',      require('./routes/payment.routes'));
app.use('/api/reviews',       require('./routes/review.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/promotions',    require('./routes/promotion.routes'));
app.use('/api/favorites',     require('./routes/favorite.routes'));
app.use('/api/admin',         require('./routes/admin.routes'));
app.use('/api/owner',         require('./routes/owner.routes'));

// Public: danh sách ngân hàng VietQR (không cần auth)
const { getBankList } = require('./utils/paymentConfig');
app.get('/api/banks', (req, res) => {
  res.json({ success: true, data: getBankList() });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbOk = false;
  try { const c = await db.getConnection(); c.release(); dbOk = true; } catch {}
  res.json({
    status: 'OK',
    message: 'SportBook API is running 🏟️',
    timestamp: new Date(),
    database: dbOk ? 'connected' : 'disconnected',
    version: '2.0.0',
  });
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} không tồn tại` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Server error:', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body quá lớn' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SportBook API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
