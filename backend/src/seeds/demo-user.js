/**
 * Tao tai khoan demo de test dang nhap local.
 * Chay: node src/seeds/demo-user.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sportbook',
  });

  const hash = await bcrypt.hash('123456', 10);
  const users = [
    ['demo', '0901234567', 'Nguoi dung Demo', 'demo@sportbook.vn', 'user'],
    ['owner', '0901234568', 'Chu san Demo', 'owner@sportbook.vn', 'owner'],
    ['admin', '0901234569', 'Admin Demo', 'admin@sportbook.vn', 'admin'],
  ];

  try {
    for (const [username, phone, name, email, role] of users) {
      await conn.execute(
        `INSERT INTO users (username, phone, name, email, password_hash, role, auth_provider, phone_verified, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, 'local', 1, 1)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           phone = VALUES(phone),
           email = VALUES(email),
           password_hash = VALUES(password_hash),
           name = VALUES(name),
           role = VALUES(role),
           auth_provider = VALUES(auth_provider),
           phone_verified = VALUES(phone_verified),
           email_verified = VALUES(email_verified)`,
        [username, phone, name, email, hash, role]
      );

      if (role === 'owner') {
        const [rows] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);
        const userId = rows[0]?.id;
        if (userId) {
          await conn.execute(
            `INSERT INTO court_owners (user_id, business_name, status)
             VALUES (?, 'Chu san Demo', 'approved')
             ON DUPLICATE KEY UPDATE business_name = VALUES(business_name), status = VALUES(status)`,
            [userId]
          );
        }
      }
    }

    console.log('✅ Demo accounts created/updated. Password for all: 123456');
    console.log('   user:  demo  | demo@sportbook.vn');
    console.log('   owner: owner | owner@sportbook.vn');
    console.log('   admin: admin | admin@sportbook.vn');
  } catch (e) {
    console.error('❌', e.message);
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      console.error('   Run first: node src/seeds/migrate.js');
    }
  } finally {
    await conn.end();
  }
}

seed();
