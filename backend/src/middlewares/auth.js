const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    db.query('SELECT id, phone, name, email, role, avatar_url, is_verified FROM users WHERE id = ?', [decoded.userId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      req.user = results[0];
      next();
    });
  });
};

module.exports = authenticate;
