const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db'); // pool.promise()
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

// â”€â”€â”€ Google OAuth Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getGoogleOAuthRedirectUri() {
  const explicit = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const pub = (process.env.PUBLIC_BASE_URL || '').trim();
  if (pub) return `${pub.replace(/\/$/, '')}/api/auth/google/callback`;
  return `http://127.0.0.1:${process.env.PORT || 5000}/api/auth/google/callback`;
}

/** Google khÃ´ng cháº¥p nháº­n redirect vá» private IP / localhost (lá»—i device_id / invalid_request). */
function googleOAuthRedirectMisconfigured(redirectUri) {
  try {
    const u = new URL(redirectUri);
    if (u.protocol !== 'https:') {
      return 'Redirect URI pháº£i dÃ¹ng HTTPS (vÃ­ dá»¥ ngrok: https://xxx.ngrok-free.app/api/auth/google/callback).';
    }
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) {
      return 'Google khÃ´ng cho redirect vá» localhost. DÃ¹ng ngrok hoáº·c domain public.';
    }
    if (h.startsWith('10.')) return 'Google khÃ´ng cho redirect vá» IP 10.x (máº¡ng ná»™i bá»™). DÃ¹ng ngrok.';
    if (h.startsWith('192.168.')) return 'Google khÃ´ng cho redirect vá» 192.168.x. DÃ¹ng ngrok.';
    const m = /^172\.(\d+)\./.exec(h);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 16 && n <= 31) return 'Google khÃ´ng cho redirect vá» 172.16â€“31.x (lá»—i báº¡n Ä‘ang gáº·p). DÃ¹ng ngrok.';
    }
    return null;
  } catch {
    return 'GOOGLE_REDIRECT_URI hoáº·c PUBLIC_BASE_URL khÃ´ng há»£p lá»‡.';
  }
}

function appDeepLink(params) {
  return `sportbook://auth?${new URLSearchParams(params).toString()}`;
}

// GET /api/auth/google/status â€” App gá»i trÆ°á»›c khi má»Ÿ OAuth (khÃ´ng cáº§n Ä‘Äƒng nháº­p)
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

// â”€â”€â”€ In-memory OTP store (production: dÃ¹ng Redis) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const otpStore = new Map();

// â”€â”€â”€ Nodemailer transporter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// â”€â”€â”€ Helper: táº¡o JWT token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function signToken(userId, role) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// â”€â”€â”€ Helper: xÃ¡c thá»±c OTP tá»« store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function verifyOtpFromStore(key, otp) {
  const stored = otpStore.get(key);
  if (!stored) return { ok: false, message: 'OTP khÃ´ng tá»“n táº¡i. Vui lÃ²ng gá»­i láº¡i.' };
  if (Date.now() > stored.expiry) {
    otpStore.delete(key);
    return { ok: false, message: 'OTP Ä‘Ã£ háº¿t háº¡n' };
  }
  if (stored.otp !== otp) return { ok: false, message: 'OTP khÃ´ng Ä‘Ãºng' };
  otpStore.delete(key);
  return { ok: true };
}

// â”€â”€â”€ Helper: format user response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/send-email-otp
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Thiáº¿u email' });

  const otp = process.env.OTP_DEMO_MODE === 'true'
    ? '123456'
    : Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;
  otpStore.set(email, { otp, expiry });

  try {
    const info = await transporter.sendMail({
      from: '"SportBook" <no-reply@sportbook.com>',
      to: email,
      subject: 'MÃ£ xÃ¡c thá»±c SportBook',
      text: `MÃ£ OTP cá»§a báº¡n lÃ : ${otp}. MÃ£ nÃ y cÃ³ hiá»‡u lá»±c trong 5 phÃºt.`,
    });
    console.log(`ðŸ“§ OTP for ${email}: ${otp} (Preview: ${nodemailer.getTestMessageUrl(info)})`);
  } catch (err) {
    console.error('Email send error:', err);
  }

  res.json({ success: true, message: 'OTP Ä‘Ã£ Ä‘Æ°á»£c gá»­i tá»›i email', email });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/verify-email-otp
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/verify-email-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin' });

  const stored = otpStore.get(email);
  if (!stored) return res.status(400).json({ success: false, message: 'OTP khÃ´ng tá»“n táº¡i. Vui lÃ²ng gá»­i láº¡i.' });
  if (Date.now() > stored.expiry) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP Ä‘Ã£ háº¿t háº¡n' });
  }
  if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'OTP khÃ´ng Ä‘Ãºng' });

  otpStore.delete(email);

  try {
    await db.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);
    res.json({ success: true, message: 'XÃ¡c thá»±c email thÃ nh cÃ´ng' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lá»—i cáº­p nháº­t DB' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/send-otp (SMS)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^(0|\+84)[0-9]{8,9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡' });
  }

  const otp = process.env.OTP_DEMO_MODE === 'true'
    ? '123456'
    : Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;
  otpStore.set(phone, { otp, expiry });
  console.log(`ðŸ“± OTP for ${phone}: ${otp}`);

  const payload = { success: true, message: 'OTP Ä‘Ã£ Ä‘Æ°á»£c gá»­i', phone };
  if (process.env.OTP_DEMO_MODE === 'true') {
    payload.demoOtp = otp;
    payload.message = 'OTP Ä‘Ã£ Ä‘Æ°á»£c gá»­i (demo: xem mÃ£ trong log server hoáº·c dÃ¹ng 123456)';
  }
  res.json(payload);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/verify-phone-otp
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/verify-phone-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin' });

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
      return res.json({ success: true, tempToken, message: 'XÃ¡c thá»±c thÃ nh cÃ´ng' });
    }

    res.json({ success: true, message: 'XÃ¡c thá»±c thÃ nh cÃ´ng' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/verify-otp â€” ÄÄƒng nháº­p / Ä‘Äƒng kÃ½ / quÃªn MK báº±ng SÄT (Alobo-style)
// purpose: "login" | "reset" | "register"
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, purpose = 'login', username, name, password, email } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin' });

  const check = verifyOtpFromStore(phone, otp);
  if (!check.ok) return res.status(400).json({ success: false, message: check.message });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);

    // ÄÄƒng kÃ½ má»›i â€” xÃ¡c thá»±c OTP rá»“i táº¡o tÃ i khoáº£n
    if (purpose === 'register') {
      if (!username || !name || !password) {
        return res.status(400).json({ success: false, message: 'Thiáº¿u username, há» tÃªn hoáº·c máº­t kháº©u' });
      }
      if (users.length > 0) {
        return res.status(409).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½' });
      }
      const [dupUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      if (dupUser.length > 0) {
        return res.status(409).json({ success: false, message: 'TÃ i khoáº£n (username) Ä‘Ã£ tá»“n táº¡i' });
      }
      if (email) {
        const [dupEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (dupEmail.length > 0) {
          return res.status(409).json({ success: false, message: 'Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng' });
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
        message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng',
      });
    }

    // QuÃªn máº­t kháº©u â€” user pháº£i tá»“n táº¡i
    if (purpose === 'reset') {
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i chÆ°a Ä‘Äƒng kÃ½' });
      }
      const tempToken = jwt.sign(
        { userId: users[0].id, type: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({ success: true, isNewUser: false, tempToken, message: 'XÃ¡c thá»±c thÃ nh cÃ´ng' });
    }

    // ÄÄƒng nháº­p OTP â€” user má»›i â†’ Ä‘Äƒng kÃ½
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
        message: 'Sá»‘ Ä‘iá»‡n thoáº¡i chÆ°a cÃ³ tÃ i khoáº£n. Vui lÃ²ng hoÃ n táº¥t Ä‘Äƒng kÃ½.',
      });
    }

    // User Ä‘Ã£ cÃ³ â†’ Ä‘Äƒng nháº­p
    const user = users[0];
    await db.query('UPDATE users SET phone_verified = 1 WHERE id = ?', [user.id]);
    const token = signToken(user.id, user.role);
    return res.json({
      success: true,
      isNewUser: false,
      token,
      user: formatUser(user),
      message: 'ÄÄƒng nháº­p thÃ nh cÃ´ng',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/login
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Vui lÃ²ng nháº­p tÃ i khoáº£n vÃ  máº­t kháº©u' });

  try {
    const [results] = await db.query(
      'SELECT * FROM users WHERE username = ? OR phone = ? OR email = ?',
      [username, username, username]
    );

    if (results.length === 0)
      return res.status(401).json({ success: false, message: 'TÃ i khoáº£n khÃ´ng tá»“n táº¡i' });

    const user = results[0];

    if (user.role === 'banned')
      return res.status(403).json({ success: false, message: 'TÃ i khoáº£n Ä‘Ã£ bá»‹ khÃ³a' });

    if (!user.password_hash)
      return res.status(401).json({ success: false, message: 'TÃ i khoáº£n nÃ y Ä‘Äƒng nháº­p báº±ng Google' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Máº­t kháº©u khÃ´ng Ä‘Ãºng' });

    const token = signToken(user.id, user.role);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_BAD_FIELD_ERROR' && String(err.message).includes('username')) {
      return res.status(500).json({
        success: false,
        message: 'Database thiáº¿u cá»™t username. Cháº¡y: node src/seeds/migrate.js',
      });
    }
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/auth/google/start â€” Má»Ÿ tá»« app (Expo Go), redirect sang Google
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/google/start', (req, res) => {
  const redirectUri = getGoogleOAuthRedirectUri();
  const mis = googleOAuthRedirectMisconfigured(redirectUri);
  if (mis) {
    console.warn('âš ï¸ Google OAuth:', mis, '| redirect_uri =', redirectUri);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="font-family:sans-serif;padding:20px;max-width:520px;margin:auto;">
<h2>Cáº¥u hÃ¬nh Google Ä‘Äƒng nháº­p</h2>
<p><strong>${mis}</strong></p>
<p>Google khÃ´ng cho dÃ¹ng IP Wiâ€‘Fi kiá»ƒu <code>172.20.x.x</code> lÃ m redirect.</p>
<ol>
<li>CÃ i <a href="https://ngrok.com">ngrok</a>, cháº¡y: <code>ngrok http 5000</code></li>
<li>Copy URL dáº¡ng <code>https://xxxx.ngrok-free.app</code></li>
<li>Trong <code>backend/.env</code> Ä‘áº·t:<br>
<code>PUBLIC_BASE_URL=https://xxxx.ngrok-free.app</code><br>
<code>GOOGLE_REDIRECT_URI=https://xxxx.ngrok-free.app/api/auth/google/callback</code></li>
<li>Google Cloud â†’ Credentials â†’ OAuth Web client â†’ <strong>Authorized redirect URIs</strong> â†’ thÃªm Ä‘Ãºng dÃ²ng GOOGLE_REDIRECT_URI (cÃ¹ng project vá»›i Client ID trong .env).</li>
<li>Restart backend, thá»­ láº¡i trÃªn app.</li>
</ol>
<p><small>ÄÃ³ng tab nÃ y vÃ  quay láº¡i app.</small></p>
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
  console.log('ðŸ”— Google OAuth redirect_uri:', redirectUri);
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/auth/google/callback â€” Google redirect vá» Ä‘Ã¢y â†’ sportbook://auth
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(appDeepLink({ error: String(error) }));
  }
  if (!code) {
    return res.redirect(appDeepLink({ error: 'Thiáº¿u mÃ£ xÃ¡c thá»±c tá»« Google' }));
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
    console.error('âŒ Google callback error:', err.message);
    return res.redirect(appDeepLink({ error: err.message || 'ÄÄƒng nháº­p Google tháº¥t báº¡i' }));
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/google â€” API fallback (idToken / code tá»« client)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          return res.status(401).json({ success: false, message: 'KhÃ´ng thá»ƒ Ä‘á»•i code láº¥y token', detail: tokenData.error_description });
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
      console.error('âŒ Google code exchange error:', e.message);
      return res.status(401).json({ success: false, message: 'Lá»—i xÃ¡c thá»±c Google', detail: e.message });
    }
  } else if (idToken) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Google token khÃ´ng há»£p lá»‡', detail: e.message });
    }
  } else {
    return res.status(400).json({ success: false, message: 'Thiáº¿u idToken hoáº·c code' });
  }

  try {
    const { token, user } = await loginOrRegisterWithGoogle(payload);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Google auth DB error:', err);
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/apple
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/apple', async (req, res) => {
  const { appleId, email, name, identityToken } = req.body;
  if (!appleId) return res.status(400).json({ success: false, message: 'Thiáº¿u Apple ID' });

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
        message: 'Database chÆ°a cÃ³ cá»™t apple_id. Cháº¡y: node src/seeds/migrate.js',
      });
    }
    res.status(500).json({ success: false, message: 'Lá»—i Ä‘Äƒng nháº­p Apple' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/register-phone â€” HoÃ n táº¥t Ä‘Äƒng kÃ½ sau OTP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/register-phone', async (req, res) => {
  const { tempToken, name, password, email } = req.body;
  if (!tempToken || !name) {
    return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin Ä‘Äƒng kÃ½' });
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'PhiÃªn Ä‘Äƒng kÃ½ háº¿t háº¡n. Vui lÃ²ng nháº­p OTP láº¡i.' });
  }

  if (decoded.type !== 'register' || !decoded.phone) {
    return res.status(401).json({ success: false, message: 'Token khÃ´ng há»£p lá»‡' });
  }

  const phone = decoded.phone;
  const username = `user_${phone.replace(/\D/g, '').slice(-9)}`;
  const hashedPw = password ? await bcrypt.hash(password, 10) : null;

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½' });
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
      message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng!',
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
      return res.status(409).json({ success: false, message: 'TÃ i khoáº£n Ä‘Ã£ tá»“n táº¡i' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'ÄÄƒng kÃ½ tháº¥t báº¡i' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/register
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/register', async (req, res) => {
  const { username, password, name, email, phone, role = 'user' } = req.body;
  if (!username || !password || !name)
    return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c (username, password, name)' });

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
      success: true, message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng!', token,
      user: { id: userId, username, phone: phone || null, name, email: email || null, role: userRole, avatar: null, phone_verified: 0, email_verified: 0 },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('username')) return res.status(409).json({ success: false, message: 'TÃ i khoáº£n Ä‘Ã£ tá»“n táº¡i' });
      if (err.sqlMessage.includes('phone')) return res.status(409).json({ success: false, message: 'Sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng' });
      if (err.sqlMessage.includes('email')) return res.status(409).json({ success: false, message: 'Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'ÄÄƒng kÃ½ tháº¥t báº¡i', error: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/reset-password
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/reset-password', async (req, res) => {
  const { tempToken, newPassword } = req.body;
  if (!tempToken || !newPassword)
    return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin' });

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token khÃ´ng há»£p lá»‡ hoáº·c háº¿t háº¡n' });
  }

  if (decoded.type !== 'reset')
    return res.status(401).json({ success: false, message: 'Token khÃ´ng há»£p lá»‡' });

  try {
    const hashedPw = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPw, decoded.userId]);
    res.json({ success: true, message: 'Äá»•i máº­t kháº©u thÃ nh cÃ´ng. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Äá»•i máº­t kháº©u tháº¥t báº¡i' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/auth/me
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PUT /api/auth/profile
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/profile', authenticate, async (req, res) => {
  const { name, email, avatar_url } = req.body;
  try {
    await db.query(
      'UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?',
      [name || req.user.name, email || req.user.email, avatar_url || null, req.user.id]
    );
    res.json({ success: true, message: 'Cáº­p nháº­t há»“ sÆ¡ thÃ nh cÃ´ng' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/auth/avatar
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  if (!req.file) return res.status(400).json({ success: false, message: 'KhÃ´ng cÃ³ file áº£nh' });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);
    res.json({ success: true, avatar_url: avatarUrl, message: 'Cáº­p nháº­t áº£nh Ä‘áº¡i diá»‡n thÃ nh cÃ´ng' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
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

