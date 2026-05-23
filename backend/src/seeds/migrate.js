require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sportbook',
      multipleStatements: true,
    });

    console.log('🔄 Starting migration...\n');

    const run = async (sql, label) => {
      try { await conn.execute(sql); console.log(`  ✅ ${label}`); }
      catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR' ||
            e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate column')) {
          console.log(`  ⚠️  ${label} (already exists, skipped)`);
        } else {
          console.error(`  ❌ ${label}: ${e.message}`);
        }
      }
    };

    // ── users ────────────────────────────────────────────────────────────────
    console.log('📋 Table: users');
    await run("ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id", 'users.username');
    await run("ALTER TABLE users ADD COLUMN apple_id VARCHAR(255) UNIQUE", 'users.apple_id');
    await run("ALTER TABLE users ADD COLUMN email_verified TINYINT DEFAULT 0", 'users.email_verified');
    await run("ALTER TABLE users CHANGE COLUMN is_verified phone_verified TINYINT DEFAULT 0", 'users.phone_verified');
    await run("ALTER TABLE users MODIFY COLUMN auth_provider ENUM('phone','google','apple','both','local') DEFAULT 'local'", 'users.auth_provider enum');
    await run("ALTER TABLE users MODIFY COLUMN role ENUM('user','owner','admin','banned') DEFAULT 'user'", 'users.role enum');
    await run("UPDATE users SET username=CONCAT('user_',id) WHERE username IS NULL", 'users.username backfill');

    // ── court_owners ─────────────────────────────────────────────────────────
    console.log('\n📋 Table: court_owners');
    await run("ALTER TABLE court_owners MODIFY COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending'", 'court_owners.status enum');
    await run("ALTER TABLE court_owners ADD COLUMN description TEXT", 'court_owners.description');
    await run("ALTER TABLE court_owners ADD COLUMN phone_contact VARCHAR(20)", 'court_owners.phone_contact');

    // ── venues ───────────────────────────────────────────────────────────────
    console.log('\n📋 Table: venues');
    await run("ALTER TABLE venues ADD COLUMN city VARCHAR(100)", 'venues.city');
    await run("ALTER TABLE venues ADD COLUMN min_price INT DEFAULT 100000", 'venues.min_price');
    await run("ALTER TABLE venues MODIFY COLUMN sport_types JSON", 'venues.sport_types json');

    // ── courts ───────────────────────────────────────────────────────────────
    console.log('\n📋 Table: courts');
    await run("ALTER TABLE courts MODIFY COLUMN sport_type VARCHAR(50)", 'courts.sport_type');
    await run("ALTER TABLE courts ADD COLUMN description TEXT", 'courts.description');

    // ── reviews ──────────────────────────────────────────────────────────────
    console.log('\n📋 Table: reviews');
    await run("ALTER TABLE reviews ADD COLUMN owner_reply_at TIMESTAMP NULL", 'reviews.owner_reply_at');

    // ── bookings ─────────────────────────────────────────────────────────────
    console.log('\n📋 Table: bookings');
    await run("ALTER TABLE bookings ADD COLUMN is_reviewed TINYINT DEFAULT 0", 'bookings.is_reviewed');
    await run("ALTER TABLE bookings ADD COLUMN note TEXT", 'bookings.note');

    // ── notifications ─────────────────────────────────────────────────────────
    console.log('\n📋 Table: notifications');
    await run("ALTER TABLE notifications ADD COLUMN booking_id INT NULL", 'notifications.booking_id');

    // ── New tables ────────────────────────────────────────────────────────────
    console.log('\n📋 New tables');

    await run(`CREATE TABLE IF NOT EXISTS app_settings (
      setting_key   VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`, 'app_settings');

    await run(`INSERT IGNORE INTO app_settings (setting_key,setting_value) VALUES
      ('bank_id','${process.env.BANK_ID||'970436'}'),
      ('account_no','${process.env.BANK_ACCOUNT||'1234567890'}'),
      ('account_name','${process.env.ACCOUNT_NAME||'SPORTBOOK'}')`, 'app_settings seed');

    await run(`CREATE TABLE IF NOT EXISTS user_push_tokens (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      token      VARCHAR(512) NOT NULL,
      platform   VARCHAR(20) DEFAULT 'unknown',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_token (user_id, token),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, 'user_push_tokens');

    await run(`CREATE TABLE IF NOT EXISTS user_favorites (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      venue_id   INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_fav (user_id, venue_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
    )`, 'user_favorites');

    console.log('\n✅ Migration completed successfully!');
  } catch(err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`\n❌ Cannot connect to MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT}. Check XAMPP/MySQL is running.`);
    } else {
      console.error('\n❌ Migration error:', err.message);
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
