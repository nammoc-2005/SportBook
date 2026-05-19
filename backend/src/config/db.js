require('dotenv').config();
const mysql = require('mysql2');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sportbook',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00'
};

const pool = mysql.createPool(poolConfig);
const promisePool = pool.promise();

module.exports = {
  query(sql, params, callback) {
    if (typeof params === 'function') {
      return pool.query(sql, params);
    }
    if (typeof callback === 'function') {
      return pool.query(sql, params, callback);
    }
    return promisePool.query(sql, params);
  },

  execute(sql, params, callback) {
    if (typeof params === 'function') {
      return pool.execute(sql, params);
    }
    if (typeof callback === 'function') {
      return pool.execute(sql, params, callback);
    }
    return promisePool.execute(sql, params);
  },

  getConnection(callback) {
    if (typeof callback === 'function') {
      return pool.getConnection(callback);
    }
    return promisePool.getConnection();
  },

  end() {
    return promisePool.end();
  },

  pool,
  promise: promisePool,
};
