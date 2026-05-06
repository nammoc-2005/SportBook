require('dotenv').config();
const db = require('./src/config/db');
db.query(
  'SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = "sportbook" ORDER BY TABLE_NAME, ORDINAL_POSITION',
  (err, r) => {
    if (err) { console.error(err.message); process.exit(1); }
    r.forEach(row => console.log(row.TABLE_NAME + ' | ' + row.COLUMN_NAME + ' | ' + row.DATA_TYPE + ' | KEY:' + row.COLUMN_KEY + ' | NULL:' + row.IS_NULLABLE + ' | DEFAULT:' + row.COLUMN_DEFAULT));
    process.exit(0);
  }
);
