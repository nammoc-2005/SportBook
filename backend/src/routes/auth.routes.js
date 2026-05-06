const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');

// In-memory OTP store (production: use Redis)
const otpStore = new Map();

// POST /api/auth/login (Login with phone & password)
router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });

  db.query('SELECT * FROM users WHERE phone = ?', [phone], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });

    const user = results[0];
    if (!user.password_hash) return res.status(401).json({ success: false, message: 'Tài khoản này chưa cài mật khẩu. Vui lòng chọn Quên mật khẩu.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
    res.json({
      success: true, token,
      user: { id: user.id, phone: user.phone, name: user.name, email: user.email, role: user.role, avatar: user.avatar_url }
    });
  });
});

// POST /api/auth/send-otp
router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^(0|\+84)[0-9]{8,9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
  }

  const otp = process.env.OTP_DEMO_MODE === 'true' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;
  otpStore.set(phone, { otp, expiry });
  console.log(`📱 OTP for ${phone}: ${otp}`);

  res.json({ success: true, message: 'OTP đã được gửi (demo: 123456)', phone });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  const stored = otpStore.get(phone);
  if (!stored) return res.status(400).json({ success: false, message: 'OTP không tồn tại. Vui lòng gửi lại.' });
  if (Date.now() > stored.expiry) { otpStore.delete(phone); return res.status(400).json({ success: false, message: 'OTP đã hết hạn' }); }
  if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'OTP không đúng' });

  otpStore.delete(phone);

  db.query('SELECT id FROM users WHERE phone = ?', [phone], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });

    if (results.length === 0) {
      // New user -> Registration
      const tempToken = jwt.sign({ phone, type: 'registration' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      return res.json({ success: true, isNewUser: true, tempToken, message: 'Vui lòng hoàn thành đăng ký.' });
    } else {
      // Existing user -> Reset Password
      const tempToken = jwt.sign({ userId: results[0].id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      return res.json({ success: true, isNewUser: false, tempToken, message: 'Vui lòng đặt lại mật khẩu mới.' });
    }
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { tempToken, name, email, password, role = 'user' } = req.body;
  if (!tempToken || !name || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });

  let decoded;
  try { decoded = jwt.verify(tempToken, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' }); }

  if (decoded.type !== 'registration') return res.status(401).json({ success: false, message: 'Token không đúng loại' });

  const userRole = ['user', 'owner'].includes(role) ? role : 'user';
  const hashedPw = await bcrypt.hash(password, 10);

  db.query('INSERT INTO users (phone, name, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)',
    [decoded.phone, name, email || null, hashedPw, userRole],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });
        return res.status(500).json({ success: false, message: 'Đăng ký thất bại', error: err.message });
      }

      const userId = result.insertId;
      if (userRole === 'owner') {
        db.query('INSERT INTO court_owners (user_id, business_name, status) VALUES (?, ?, "pending")', [userId, name], () => {});
      }

      const token = jwt.sign({ userId, role: userRole }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
      res.status(201).json({
        success: true, message: 'Đăng ký thành công!', token,
        user: { id: userId, phone: decoded.phone, name, email: email || null, role: userRole, avatar: null }
      });
    }
  );
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { tempToken, newPassword } = req.body;
  if (!tempToken || !newPassword) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  let decoded;
  try { decoded = jwt.verify(tempToken, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' }); }

  if (decoded.type !== 'reset') return res.status(401).json({ success: false, message: 'Token không hợp lệ' });

  const hashedPw = await bcrypt.hash(newPassword, 10);
  db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPw, decoded.userId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Đổi mật khẩu thất bại' });
    res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  });
});

// GET /api/auth/me
const authenticate = require('../middlewares/auth');
router.get('/me', authenticate, (req, res) => {
  db.query(`
    SELECT u.id, u.phone, u.name, u.email, u.role, u.avatar_url as avatar, u.created_at,
      co.id as owner_id, co.business_name, co.bank_account, co.bank_name, co.status as owner_status
    FROM users u LEFT JOIN court_owners co ON co.user_id = u.id WHERE u.id = ?`,
    [req.user.id], (err, results) => {
      if (err || !results.length) return res.status(404).json({ success: false, message: 'Not found' });
      const u = results[0];
      res.json({
        success: true,
        user: {
          id: u.id, phone: u.phone, name: u.name, email: u.email, role: u.role, avatar: u.avatar, created_at: u.created_at,
          ownerProfile: u.owner_id ? { id: u.owner_id, businessName: u.business_name, bankAccount: u.bank_account, bankName: u.bank_name, status: u.owner_status } : null
        }
      });
    }
  );
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `avatar_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// PUT /api/auth/profile
router.put('/profile', authenticate, (req, res) => {
  const { name, email, avatar_url } = req.body;
  db.query('UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?',
    [name || req.user.name, email || req.user.email, avatar_url || null, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Update failed' });
      res.json({ success: true, message: 'Cập nhật hồ sơ thành công' });
    }
  );
});

// POST /api/auth/avatar
router.post('/avatar', authenticate, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file ảnh' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Update failed' });
    res.json({ success: true, avatar_url: avatarUrl, message: 'Cập nhật ảnh đại diện thành công' });
  });
});

module.exports = router;
