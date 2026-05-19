const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sportbook'
    });

    console.log('Migrating schema...');
    // Make sport_type flexible
    await connection.execute('ALTER TABLE courts MODIFY sport_type VARCHAR(50)');
    // Add city and min_price if not exist
    try { await connection.execute('ALTER TABLE venues ADD COLUMN city VARCHAR(100)'); } catch(e){}
    try { await connection.execute('ALTER TABLE venues ADD COLUMN min_price INT DEFAULT 100000'); } catch(e){}

    // Update Users Table for Username-based login and Apple Sign In
    try { await connection.execute('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id'); } catch(e){}
    try { await connection.execute('ALTER TABLE users ADD COLUMN apple_id VARCHAR(255) UNIQUE AFTER google_id'); } catch(e){}
    try { await connection.execute('ALTER TABLE users ADD COLUMN email_verified TINYINT DEFAULT 0 AFTER is_verified'); } catch(e){}
    try { await connection.execute('ALTER TABLE users CHANGE COLUMN is_verified phone_verified TINYINT DEFAULT 0'); } catch(e){}
    try { await connection.execute("ALTER TABLE users MODIFY COLUMN auth_provider ENUM('phone', 'google', 'apple', 'both', 'local') DEFAULT 'local'"); } catch(e){}
    try { await connection.execute("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'owner', 'admin', 'banned') DEFAULT 'user'"); } catch(e){}
    try { await connection.execute("ALTER TABLE court_owners MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'"); } catch(e){}
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await connection.execute(
      `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES
        ('bank_id', ?),
        ('account_no', ?),
        ('account_name', ?)`,
      [
        process.env.BANK_ID || '970436',
        process.env.BANK_ACCOUNT || '1234567890',
        process.env.ACCOUNT_NAME || 'SPORTBOOK'
      ]
    );
    
    // Auto-generate usernames for existing users if username is null
    try { await connection.execute("UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL"); } catch(e){}

    console.log('✅ Migration complete');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`❌ Migration failed: cannot connect to MySQL at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}. Start MySQL/XAMPP and run this script again.`);
    } else {
      console.error('❌ Migration failed:', err.message || err);
    }
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
