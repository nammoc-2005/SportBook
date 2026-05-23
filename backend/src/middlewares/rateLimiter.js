/**
 * Simple in-memory rate limiter middleware.
 * Không cần Redis; phù hợp cho production scale nhỏ/vừa.
 * Swap sang `express-rate-limit` + Redis nếu cần scale hơn.
 */

const store = new Map(); // key → { count, resetAt }

/**
 * @param {number} windowMs  - cửa sổ thời gian (ms)
 * @param {number} max       - số request tối đa trong cửa sổ
 * @param {string} [message] - message trả về khi bị chặn
 */
function rateLimit({ windowMs = 60_000, max = 100, message = 'Quá nhiều yêu cầu, vui lòng thử lại sau.' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

// Dọn store định kỳ để tránh memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60_000);

module.exports = rateLimit;
