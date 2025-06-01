const mariadb = require('mariadb');
const config = require('../config/config');

const pool = mariadb.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  timezone: '+07:00', // เพิ่มบรรทัดนี้
  dateStrings: true    // เพิ่มบรรทัดนี้เพื่อให้ return เป็น string
});

const dbOptions = {
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  timezone: '+07:00', // เพิ่มบรรทัดนี้
  dateStrings: true    // เพิ่มบรรทัดนี้เพื่อให้ return เป็น string
};

module.exports = { pool, dbOptions };