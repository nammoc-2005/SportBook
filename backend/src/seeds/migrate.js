const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Migrating schema...');
    // Make sport_type flexible
    await connection.execute('ALTER TABLE courts MODIFY sport_type VARCHAR(50)');
    // Add city and min_price if not exist
    try { await connection.execute('ALTER TABLE venues ADD COLUMN city VARCHAR(100)'); } catch(e){}
    try { await connection.execute('ALTER TABLE venues ADD COLUMN min_price INT DEFAULT 100000'); } catch(e){}
    
    console.log('✅ Migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrate();
