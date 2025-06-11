const mysql = require('mysql2/promise');
const config = require('../config/config');

let connection;

class DBHelper {
    static async getConnection() {
        if (!connection) {
            connection = await mysql.createConnection({
                host: config.DB_HOST,
                user: config.DB_USER,
                password: config.DB_PASSWORD,
                database: config.DB_NAME,
                port: config.DB_PORT || 3306,
                timezone: '+07:00' // เซ็ต timezone เป็นไทย
            });
        }
        return connection;
    }

    static validateIdentifier(name) {
        // ตรวจสอบว่าชื่อ table/column ปลอดภัย
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    }

    static async query(sql, params = []) {
        try {
            const conn = await this.getConnection();
            const [rows] = await conn.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Transaction support
    static async beginTransaction() {
        try {
            const conn = await this.getConnection();
            await conn.beginTransaction();
        } catch (error) {
            console.error('Begin transaction error:', error);
            throw error;
        }
    }

    static async commit() {
        try {
            const conn = await this.getConnection();
            await conn.commit();
        } catch (error) {
            console.error('Commit transaction error:', error);
            throw error;
        }
    }

    static async rollback() {
        try {
            const conn = await this.getConnection();
            await conn.rollback();
        } catch (error) {
            console.error('Rollback transaction error:', error);
            throw error;
        }
    }

    static async select(table, whereObj = {}, extraParams = []) {
        if (!this.validateIdentifier(table)) {
            throw new Error('Invalid table name');
        }

        const whereKeys = Object.keys(whereObj);
        const whereValues = Object.values(whereObj);

        if (!whereKeys.every(key => this.validateIdentifier(key))) {
            throw new Error('Invalid column name(s)');
        }

        const whereClause = whereKeys.length 
            ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
            : '';
        
        const sql = `SELECT * FROM ${table} ${whereClause}`;
        return this.query(sql, [...whereValues, ...extraParams]);
    }

    static async insert(table, data) {
        if (!this.validateIdentifier(table)) {
            throw new Error('Invalid table name');
        }

        const keys = Object.keys(data);
        const values = Object.values(data);

        if (!keys.every(key => this.validateIdentifier(key))) {
            throw new Error('Invalid column name(s)');
        }

        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        
        const result = await this.query(sql, values);
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    }

    static async update(table, data, whereObj) {
        if (!this.validateIdentifier(table)) {
            throw new Error('Invalid table name');
        }

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
        const result = await this.query(sql, [...setValues, ...whereValues]);
        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    }

    static async delete(table, whereObj) {
        if (!this.validateIdentifier(table)) {
            throw new Error('Invalid table name');
        }

        const whereKeys = Object.keys(whereObj);
        const whereValues = Object.values(whereObj);

        if (!whereKeys.every(key => this.validateIdentifier(key))) {
            throw new Error('Invalid column name(s)');
        }

        if (whereKeys.length === 0) {
            throw new Error('WHERE clause is required for DELETE operations');
        }

        const whereClause = 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ');
        const sql = `DELETE FROM ${table} ${whereClause}`;
        
        const result = await this.query(sql, whereValues);
        return {
            affectedRows: result.affectedRows
        };
    }
    
    static async selectSql(selected,table, whereObj = {},join = '', orderBy = '', limit = '' ) {
        const whereKeys = Object.keys(whereObj);
        const whereClause = whereKeys.length
        ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
        : '';
        const sql = `SELECT ${selected} FROM ${table} ${join} ${whereClause} ${orderBy} ${limit}`;
        const params = Object.values(whereObj);
        return DBHelper.query(sql, params);
    }
}

module.exports = DBHelper; // export แบบ direct class
