const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [results] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);

    if (!results.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const u = results[0];
    if (u.role === 'banned') {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
    }

    req.user = {
      id: u.id,
      username: u.username,
      phone: u.phone,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url,
      phone_verified: u.phone_verified ?? u.is_verified ?? 0,
      email_verified: u.email_verified ?? 0,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
