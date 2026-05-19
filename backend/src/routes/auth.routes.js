const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db'); // pool.promise()
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

// ─── Google OAuth Client ───────────────────────────────────────────────────
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getGoogleOAuthRedirectUri() {
  const explicit = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const pub = (process.env.PUBLIC_BASE_URL || '').trim();
  if (pub) return `${pub.replace(/\/$/, '')}/api/auth/google/callback`;
  return `http://127.0.0.1:${process.env.PORT || 5000}/api/auth/google/callback`;
}

/** Google không chấp nhận redirect về private IP / localhost (lỗi device_id / invalid_request). */
function googleOAuthRedirectMisconfigured(redirectUri) {
  try {
    const u = new URL(redirectUri);
    if (u.protocol !== 'https:') {
      return 'Redirect URI phải dùng HTTPS (ví dụ ngrok: https://xxx.ngrok-free.app/api/auth/google/callback).';
    }
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) {
      return 'Google không cho redirect về localhost. Dùng ngrok hoặc domain public.';
    }
    if (h.startsWith('10.')) return 'Google không cho redirect về IP 10.x (mạng nội bộ). Dùng ngrok.';
    if (h.startsWith('192.168.')) return 'Google không cho redirect về 192.168.x. Dùng ngrok.';
    const m = /^172\.(\d+)\./.exec(h);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 16 && n <= 31) return 'Google không cho redirect về 172.16–31.x (lỗi bạn đang gặp). Dùng ngrok.';
    }
    return null;
  } catch {
    return 'GOOGLE_REDIRECT_URI hoặc PUBLIC_BASE_URL không hợp lệ.';
  }
}

function appDeepLink(params) {
  return `sportbook://auth?${new URLSearchParams(params).toString()}`;
}

// GET /api/auth/google/status — App gọi trước khi mở OAuth (không cần đăng nhập)
router.get('/google/status', (req, res) => {
  const redirectUri = getGoogleOAuthRedirectUri();
  const mis = googleOAuthRedirectMisconfigured(redirectUri);
  res.json({
    success: true,
    googleOAuthReady: !mis,
    redirectUri,
    hint: mis,
  });
});

async function exchangeGoogleAuthCode(code, redirectUri) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.id_token) {
    const msg = tokenData.error_description || tokenData.error || 'Token exchange failed';
    throw new Error(msg);
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: tokenData.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

async function loginOrRegisterWithGoogle(payload) {
  const { sub: googleId, email, name, picture } = payload;

  const [byGoogle] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
  if (byGoogle.length > 0) {
    const token = signToken(byGoogle[0].id, byGoogle[0].role);
    return { token, user: formatUser(byGoogle[0], picture) };
  }

  const [byEmail] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (byEmail.length > 0) {
    const existing = byEmail[0];
    await db.query(
      'UPDATE users SET google_id = ?, auth_provider = "both", avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
      [googleId, picture, existing.id]
    );
    const token = signToken(existing.id, existing.role);
    return { token, user: formatUser(existing, picture) };
  }

  const generatedUsername = `google_${String(googleId).substring(0, 8)}`;
  const [result] = await db.query(
    'INSERT INTO users (username, google_id, email, name, avatar_url, role, auth_provider, phone_verified, email_verified) VALUES (?, ?, ?, ?, ?, "user", "google", 0, 1)',
    [generatedUsername, googleId, email, name, picture]
  );
  const token = signToken(result.insertId, 'user');
  return {
    token,
    user: {
      id: result.insertId,
      username: generatedUsername,
      phone: null,
      name,
      email,
      role: 'user',
      avatar: picture,
      phone_verified: 0,
      email_verified: 1,
    },
  };
}

// ─── In-memory OTP store (production: dùng Redis) ─────────────────────────
const otpStore = new Map();

// ─── Nodemailer transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Helper: tạo JWT token ─────────────────────────────────────────────────
function signToken(userId, role) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// ─── Helper: xác thực OTP từ store ─────────────────────────────────────────
function verifyOtpFromStore(key, otp) {
  const stored = otpStore.get(key);
  if (!stored) return { ok: false, message: 'OTP không tồn tại. Vui lòng gửi lại.' };
  if (Date.now() > stored.expiry) {
    otpStore.delete(key);
    return { ok: false, message: 'OTP đã hết hạn' };
  }
  if (stored.otp !== otp) return { ok: false, message: 'OTP không đúng' };
  otpStore.delete(key);
  return { ok: true };
}

// ─── Helper: format user response ─────────────────────────────────────────
function formatUser(user, avatarFallback = null) {
  return {
    id: user.id,
    username: user.username,
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar_url || avatarFallback,
    phone_verified: user.phone_verified,
    email_verified: user.email_verified,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-email-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Thiếu email' });

  const otp = process.env.OTP_DEMO_MODE === 'true'
    ? '123456'
    : Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;
  otpStore.set(email, { otp, expiry });

  try {
    const info = await transporter.sendMail({
      from: '"SportBook" <no-reply@sportbook.com>',
      to: email,
      subject: 'Mã xác thực SportBook',
      text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`,
    });
    console.log(`📧 OTP for ${email}: ${otp} (Preview: ${nodemailer.getTestMessageUrl(info)})`);
  } catch (err) {
    console.error('Email send error:', err);
  }

  res.json({ success: true, message: 'OTP đã được gửi tới email', email });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-email-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-email-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  const stored = otpStore.get(email);
  if (!stored) return res.status(400).json({ success: false, message: 'OTP không tồn tại. Vui lòng gửi lại.' });
  if (Date.now() > stored.expiry) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP đã hết hạn' });
  }
  if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'OTP không đúng' });

  otpStore.delete(email);

  try {
    await db.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);
    res.json({ success: true, message: 'Xác thực email thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật DB' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp (SMS)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^(0|\+84)[0-9]{8,9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
  }

  const otp = process.env.OTP_DEMO_MODE === 'true'
    ? '123456'
    : Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;
  otpStore.set(phone, { otp, expiry });
  console.log(`📱 OTP for ${phone}: ${otp}`);

  const payload = { success: true, message: 'OTP đã được gửi', phone };
  if (process.env.OTP_DEMO_MODE === 'true') {
    payload.demoOtp = otp;
    payload.message = 'OTP đã được gửi (demo: xem mã trong log server hoặc dùng 123456)';
  }
  res.json(payload);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-phone-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-phone-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  const check = verifyOtpFromStore(phone, otp);
  if (!check.ok) return res.status(400).json({ success: false, message: check.message });

  try {
    await db.query('UPDATE users SET phone_verified = 1 WHERE phone = ?', [phone]);
    const [rows] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);

    if (rows.length > 0) {
      const tempToken = jwt.sign(
        { userId: rows[0].id, type: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({ success: true, tempToken, message: 'Xác thực thành công' });
    }

    res.json({ success: true, message: 'Xác thực thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp — Đăng nhập / đăng ký / quên MK bằng SĐT (Alobo-style)
// purpose: "login" | "reset" | "register"
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, purpose = 'login', username, name, password, email } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  const check = verifyOtpFromStore(phone, otp);
  if (!check.ok) return res.status(400).json({ success: false, message: check.message });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);

    // Đăng ký mới — xác thực OTP rồi tạo tài khoản
    if (purpose === 'register') {
      if (!username || !name || !password) {
        return res.status(400).json({ success: false, message: 'Thiếu username, họ tên hoặc mật khẩu' });
      }
      if (users.length > 0) {
        return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });
      }
      const [dupUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      if (dupUser.length > 0) {
        return res.status(409).json({ success: false, message: 'Tài khoản (username) đã tồn tại' });
      }
      if (email) {
        const [dupEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (dupEmail.length > 0) {
          return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
        }
      }

      const hashedPw = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        `INSERT INTO users (username, phone, name, email, password_hash, role, auth_provider, phone_verified, email_verified)
         VALUES (?, ?, ?, ?, ?, "user", "local", 1, 0)`,
        [username, phone, name, email || null, hashedPw]
      );

      const userId = result.insertId;
      const token = signToken(userId, 'user');
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: userId,
          username,
          phone,
          name,
          email: email || null,
          role: 'user',
          avatar: null,
          phone_verified: 1,
          email_verified: 0,
        },
        message: 'Đăng ký thành công',
      });
    }

    // Quên mật khẩu — user phải tồn tại
    if (purpose === 'reset') {
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Số điện thoại chưa đăng ký' });
      }
      const tempToken = jwt.sign(
        { userId: users[0].id, type: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({ success: true, isNewUser: false, tempToken, message: 'Xác thực thành công' });
    }

    // Đăng nhập OTP — user mới → đăng ký
    if (users.length === 0) {
      const tempToken = jwt.sign(
        { phone, type: 'register' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({
        success: true,
        isNewUser: true,
        tempToken,
        message: 'Số điện thoại chưa có tài khoản. Vui lòng hoàn tất đăng ký.',
      });
    }

    // User đã có → đăng nhập
    const user = users[0];
    await db.query('UPDATE users SET phone_verified = 1 WHERE id = ?', [user.id]);
    const token = signToken(user.id, user.role);
    return res.json({
      success: true,
      isNewUser: false,
      token,
      user: formatUser(user),
      message: 'Đăng nhập thành công',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });

  try {
    const [results] = await db.query(
      'SELECT * FROM users WHERE username = ? OR phone = ? OR email = ?',
      [username, username, username]
    );

    if (results.length === 0)
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });

    const user = results[0];

    if (user.role === 'banned')
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });

    if (!user.password_hash)
      return res.status(401).json({ success: false, message: 'Tài khoản này đăng nhập bằng Google' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });

    const token = signToken(user.id, user.role);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_BAD_FIELD_ERROR' && String(err.message).includes('username')) {
      return res.status(500).json({
        success: false,
        message: 'Database thiếu cột username. Chạy: node src/seeds/migrate.js',
      });
    }
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google/start — Mở từ app (Expo Go), redirect sang Google
// ─────────────────────────────────────────────────────────────────────────────
router.get('/google/start', (req, res) => {
  const redirectUri = getGoogleOAuthRedirectUri();
  const mis = googleOAuthRedirectMisconfigured(redirectUri);
  if (mis) {
    console.warn('⚠️ Google OAuth:', mis, '| redirect_uri =', redirectUri);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="font-family:sans-serif;padding:20px;max-width:520px;margin:auto;">
<h2>Cấu hình Google đăng nhập</h2>
<p><strong>${mis}</strong></p>
<p>Google không cho dùng IP Wi‑Fi kiểu <code>172.20.x.x</code> làm redirect.</p>
<ol>
<li>Cài <a href="https://ngrok.com">ngrok</a>, chạy: <code>ngrok http 5000</code></li>
<li>Copy URL dạng <code>https://xxxx.ngrok-free.app</code></li>
<li>Trong <code>backend/.env</code> đặt:<br>
<code>PUBLIC_BASE_URL=https://xxxx.ngrok-free.app</code><br>
<code>GOOGLE_REDIRECT_URI=https://xxxx.ngrok-free.app/api/auth/google/callback</code></li>
<li>Google Cloud → Credentials → OAuth Web client → <strong>Authorized redirect URIs</strong> → thêm đúng dòng GOOGLE_REDIRECT_URI (cùng project với Client ID trong .env).</li>
<li>Restart backend, thử lại trên app.</li>
</ol>
<p><small>Đóng tab này và quay lại app.</small></p>
</body></html>`;
    return res.status(503).type('html').send(html);
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  console.log('🔗 Google OAuth redirect_uri:', redirectUri);
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google/callback — Google redirect về đây → sportbook://auth
// ─────────────────────────────────────────────────────────────────────────────
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(appDeepLink({ error: String(error) }));
  }
  if (!code) {
    return res.redirect(appDeepLink({ error: 'Thiếu mã xác thực từ Google' }));
  }

  try {
    const redirectUri = getGoogleOAuthRedirectUri();
    const mis = googleOAuthRedirectMisconfigured(redirectUri);
    if (mis) {
      return res.redirect(appDeepLink({ error: mis }));
    }
    const payload = await exchangeGoogleAuthCode(code, redirectUri);
    const { token } = await loginOrRegisterWithGoogle(payload);
    return res.redirect(appDeepLink({ token }));
  } catch (err) {
    console.error('❌ Google callback error:', err.message);
    return res.redirect(appDeepLink({ error: err.message || 'Đăng nhập Google thất bại' }));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google — API fallback (idToken / code từ client)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { idToken, code, codeVerifier, redirectUri: clientRedirectUri } = req.body;

  let payload;

  if (code) {
    try {
      const redirectUri = clientRedirectUri || getGoogleOAuthRedirectUri();
      if (codeVerifier) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
          }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.id_token) {
          return res.status(401).json({ success: false, message: 'Không thể đổi code lấy token', detail: tokenData.error_description });
        }
        const ticket = await googleClient.verifyIdToken({
          idToken: tokenData.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } else {
        payload = await exchangeGoogleAuthCode(code, redirectUri);
      }
    } catch (e) {
      console.error('❌ Google code exchange error:', e.message);
      return res.status(401).json({ success: false, message: 'Lỗi xác thực Google', detail: e.message });
    }
  } else if (idToken) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Google token không hợp lệ', detail: e.message });
    }
  } else {
    return res.status(400).json({ success: false, message: 'Thiếu idToken hoặc code' });
  }

  try {
    const { token, user } = await loginOrRegisterWithGoogle(payload);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Google auth DB error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/apple
// ─────────────────────────────────────────────────────────────────────────────
router.post('/apple', async (req, res) => {
  const { appleId, email, name, identityToken } = req.body;
  if (!appleId) return res.status(400).json({ success: false, message: 'Thiếu Apple ID' });

  try {
    const [byApple] = await db.query('SELECT * FROM users WHERE apple_id = ?', [appleId]);
    if (byApple.length > 0) {
      const token = signToken(byApple[0].id, byApple[0].role);
      return res.json({ success: true, token, user: formatUser(byApple[0]) });
    }

    if (email) {
      const [byEmail] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (byEmail.length > 0) {
        await db.query(
          'UPDATE users SET apple_id = ?, auth_provider = "both" WHERE id = ?',
          [appleId, byEmail[0].id]
        );
        const token = signToken(byEmail[0].id, byEmail[0].role);
        return res.json({ success: true, token, user: formatUser(byEmail[0]) });
      }
    }

    const displayName = name?.givenName
      ? `${name.givenName} ${name.familyName || ''}`.trim()
      : (name || 'Apple User');
    const generatedUsername = `apple_${String(appleId).substring(0, 8)}`;

    const [result] = await db.query(
      `INSERT INTO users (username, apple_id, email, name, role, auth_provider, phone_verified, email_verified)
       VALUES (?, ?, ?, ?, "user", "apple", 0, ?)`,
      [generatedUsername, appleId, email || null, displayName, email ? 1 : 0]
    );

    const token = signToken(result.insertId, 'user');
    return res.json({
      success: true,
      token,
      user: {
        id: result.insertId,
        username: generatedUsername,
        phone: null,
        name: displayName,
        email: email || null,
        role: 'user',
        avatar: null,
        phone_verified: 0,
        email_verified: email ? 1 : 0,
      },
    });
  } catch (err) {
    console.error('Apple auth error:', err);
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        success: false,
        message: 'Database chưa có cột apple_id. Chạy: node src/seeds/migrate.js',
      });
    }
    res.status(500).json({ success: false, message: 'Lỗi đăng nhập Apple' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register-phone — Hoàn tất đăng ký sau OTP
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register-phone', async (req, res) => {
  const { tempToken, name, password, email } = req.body;
  if (!tempToken || !name) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng ký' });
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Phiên đăng ký hết hạn. Vui lòng nhập OTP lại.' });
  }

  if (decoded.type !== 'register' || !decoded.phone) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }

  const phone = decoded.phone;
  const username = `user_${phone.replace(/\D/g, '').slice(-9)}`;
  const hashedPw = password ? await bcrypt.hash(password, 10) : null;

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });
    }

    const [result] = await db.query(
      `INSERT INTO users (username, phone, name, email, password_hash, role, auth_provider, phone_verified, email_verified)
       VALUES (?, ?, ?, ?, ?, "user", "phone", 1, 0)`,
      [username, phone, name, email || null, hashedPw]
    );

    const userId = result.insertId;
    const token = signToken(userId, 'user');
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: {
        id: userId,
        username,
        phone,
        name,
        email: email || null,
        role: 'user',
        avatar: null,
        phone_verified: 1,
        email_verified: 0,
      },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Tài khoản đã tồn tại' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Đăng ký thất bại' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, password, name, email, phone, role = 'user' } = req.body;
  if (!username || !password || !name)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (username, password, name)' });

  const userRole = ['user', 'owner'].includes(role) ? role : 'user';
  const hashedPw = await bcrypt.hash(password, 10);

  try {
    const [result] = await db.query(
      'INSERT INTO users (username, phone, name, email, password_hash, role, phone_verified, email_verified) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
      [username, phone || null, name, email || null, hashedPw, userRole]
    );

    const userId = result.insertId;

    if (userRole === 'owner') {
      await db.query(
        'INSERT INTO court_owners (user_id, business_name, status) VALUES (?, ?, "pending")',
        [userId, name]
      );
    }

    const token = signToken(userId, userRole);
    res.status(201).json({
      success: true, message: 'Đăng ký thành công!', token,
      user: { id: userId, username, phone: phone || null, name, email: email || null, role: userRole, avatar: null, phone_verified: 0, email_verified: 0 },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('username')) return res.status(409).json({ success: false, message: 'Tài khoản đã tồn tại' });
      if (err.sqlMessage.includes('phone')) return res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng' });
      if (err.sqlMessage.includes('email')) return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Đăng ký thất bại', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { tempToken, newPassword } = req.body;
  if (!tempToken || !newPassword)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' });
  }

  if (decoded.type !== 'reset')
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });

  try {
    const hashedPw = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPw, decoded.userId]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Đổi mật khẩu thất bại' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
const authenticate = require('../middlewares/auth');

router.get('/me', authenticate, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT u.id, u.username, u.phone, u.name, u.email, u.role, u.avatar_url as avatar,
        u.created_at, u.phone_verified, u.email_verified,
        co.id as owner_id, co.business_name, co.bank_account, co.bank_name, co.status as owner_status
       FROM users u LEFT JOIN court_owners co ON co.user_id = u.id WHERE u.id = ?`,
      [req.user.id]
    );

    if (!results.length) return res.status(404).json({ success: false, message: 'Not found' });

    const u = results[0];
    res.json({
      success: true,
      user: {
        id: u.id, username: u.username, phone: u.phone, name: u.name,
        email: u.email, role: u.role, avatar: u.avatar, created_at: u.created_at,
        phone_verified: u.phone_verified, email_verified: u.email_verified,
        ownerProfile: u.owner_id ? {
          id: u.owner_id, businessName: u.business_name,
          bankAccount: u.bank_account, bankName: u.bank_name, status: u.owner_status,
        } : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  const { name, email, avatar_url } = req.body;
  try {
    await db.query(
      'UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?',
      [name || req.user.name, email || req.user.email, avatar_url || null, req.user.id]
    );
    res.json({ success: true, message: 'Cập nhật hồ sơ thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/avatar
// ─────────────────────────────────────────────────────────────────────────────
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
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file ảnh' });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);
    res.json({ success: true, avatar_url: avatarUrl, message: 'Cập nhật ảnh đại diện thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  try {
    const [users] = await db.query('SELECT password_hash, auth_provider FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    const user = users[0];
    if (user.auth_provider && user.auth_provider !== 'local' && user.auth_provider !== 'phone' && user.auth_provider !== 'both') {
      return res.status(400).json({ success: false, message: 'Tài khoản mạng xã hội không thể đổi mật khẩu' });
    }

    if (!user.password_hash) {
       const hashedPw = await bcrypt.hash(newPassword, 10);
       await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPw, req.user.id]);
       return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    const hashedPw = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPw, req.user.id]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
