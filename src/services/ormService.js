const {pool} = require('./dbService');

class DBHelper {
  static validateIdentifier(name) {
    const validName = /^[a-zA-Z0-9_]+$/;
    return validName.test(name);
  }

  static async query(sql, params) {
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

  static async select(table, whereObj = {}, extraParams = []) {
    const whereKeys = Object.keys(whereObj);
    const whereClause = whereKeys.length
      ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
      : '';
    const sql = `SELECT * FROM ${table} ${whereClause}`;
    const params = Object.values(whereObj).concat(extraParams);
    return DBHelper.query(sql, params);
  }

  static async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    if (!keys.every(key => DBHelper.validateIdentifier(key))) {
      throw new Error('Invalid column name(s)');
    }

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return DBHelper.query(sql, values);
  }

  static async update(table, data, whereObj) {
    const setKeys = Object.keys(data);
    const setValues = Object.values(data);

    if (!setKeys.every(key => DBHelper.validateIdentifier(key))) {
      throw new Error('Invalid column name(s)');
    }

    const setClause = setKeys.map(key => `${key} = ?`).join(', ');

    const whereKeys = Object.keys(whereObj);
    const whereValues = Object.values(whereObj);

    if (!whereKeys.every(key => DBHelper.validateIdentifier(key))) {
      throw new Error('Invalid column name(s) in WHERE clause');
    }

    const whereClause = whereKeys.length
      ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
      : '';

    const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
    return DBHelper.query(sql, [...setValues, ...whereValues]);
  }
}

module.exports = { DBHelper };
