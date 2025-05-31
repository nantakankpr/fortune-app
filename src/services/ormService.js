const {pool} = require('./dbService');

const allowedTables = ['users', 'orders', 'products','packages','promptpay_recipients','subscriptions','transactions']; // เพิ่มชื่อ table ที่อนุญาตให้ใช้

class DBHelper {
  validateIdentifier(name) {
    const validName = /^[a-zA-Z0-9_]+$/;
    return validName.test(name);
  }

  validateTableName(table) {
    return allowedTables.includes(table);
  }

  async query(sql, params) {
    let conn;
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SQL]', sql);
        console.log('[PARAMS]', JSON.stringify(params));
      }

      conn = await pool.getConnection();
      const res = await conn.query(sql, params);
      return res;
    } catch (err) {
      console.error('DB ERROR:', err);
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }

  async select(table, whereObj = {}, extraParams = []) {
    if (!this.validateTableName(table)) throw new Error('Invalid table name');

    const whereKeys = Object.keys(whereObj);
    const whereClause = whereKeys.length
      ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
      : '';
    const sql = `SELECT * FROM ${table} ${whereClause}`;
    const params = Object.values(whereObj).concat(extraParams);
    return this.query(sql, params);
  }

  async insert(table, data) {
    if (!this.validateTableName(table)) throw new Error('Invalid table name');

    const keys = Object.keys(data);
    const values = Object.values(data);

    if (!keys.every(key => this.validateIdentifier(key))) {
      throw new Error('Invalid column name(s)');
    }

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return this.query(sql, values);
  }

  async update(table, data, whereObj) {
    if (!this.validateTableName(table)) throw new Error('Invalid table name');

    const setKeys = Object.keys(data);
    const setValues = Object.values(data);

    if (!setKeys.every(key => this.validateIdentifier(key))) {
      throw new Error('Invalid column name(s)');
    }

    const setClause = setKeys.map(key => `${key} = ?`).join(', ');

    const whereKeys = Object.keys(whereObj);
    const whereValues = Object.values(whereObj);

    if (!whereKeys.every(key => this.validateIdentifier(key))) {
      throw new Error('Invalid column name(s) in WHERE clause');
    }

    const whereClause = whereKeys.length
      ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
      : '';

    const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
    return this.query(sql, [...setValues, ...whereValues]);
  }
}

module.exports = { DBHelper: new DBHelper() };
