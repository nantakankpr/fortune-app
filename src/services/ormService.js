const mysql = require('mysql2/promise');
const config = require('../config/config');

let pool;

class DBHelper {
    static async getPool() {
        if (!pool) {
            pool = mysql.createPool({
                host: config.DB_HOST,
                user: config.DB_USER,
                password: config.DB_PASSWORD,
                database: config.DB_NAME,
                waitForConnections: true,
                connectionLimit: 8,
                queueLimit: 100,
                idleTimeout: 300000,
                charset: 'utf8mb4',
                timezone: '+07:00'
            });

        }
        return pool;
    }

    static validateIdentifier(name) {
        // ตรวจสอบว่าชื่อ table/column ปลอดภัย
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    }

    static async query(sql, params = []) {
        try {
            const pool = await this.getPool();
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
    }

    // Transaction methods สำหรับ pool
    static async transaction(callback) {
        const pool = await this.getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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

    static async selectSql(selected, table, whereObj = {}, join = '', orderBy = '', limit = '') {
        const whereKeys = Object.keys(whereObj);
        const whereClause = whereKeys.length
            ? 'WHERE ' + whereKeys.map(key => `${key} = ?`).join(' AND ')
            : '';
        const sql = `SELECT ${selected} FROM ${table} ${join} ${whereClause} ${orderBy} ${limit}`;
        const params = Object.values(whereObj);
        return DBHelper.query(sql, params);
    }

    /**
     * ปิด database pool
     */
    static async closePool() {
        if (pool) {
            try {
                console.log('🔌 Closing database pool...');
                await pool.end();
                pool = null;
                console.log('✅ Database pool closed successfully');
            } catch (error) {
                console.error('❌ Error closing database pool:', error);
                throw error;
            }
        } else {
            console.log('ℹ️ Database pool is already closed or not initialized');
        }
    }

    /**
     * ตรวจสอบสถานะ pool
     */
    static getPoolStatus() {
        if (!pool) {
            return { status: 'not_initialized' };
        }

        return {
            status: 'active',
            totalConnections: pool.pool._allConnections ? pool.pool._allConnections.length : 0,
            freeConnections: pool.pool._freeConnections ? pool.pool._freeConnections.length : 0,
            queuedRequests: pool.pool._connectionQueue ? pool.pool._connectionQueue.length : 0
        };
    }

    /**
     * Health check สำหรับ pool
     */
    static async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health_check');
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                pool: this.getPoolStatus()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
                pool: this.getPoolStatus()
            };
        }
    }
}

// Handle process termination (เพิ่มการปิด pool อัตโนมัติ)
process.on('exit', () => {
    console.log('🚪 Process exiting, cleaning up database connections...');
    if (pool) {
        try {
            pool.end();
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error);
    try {
        await DBHelper.closePool();
    } catch (closeError) {
        console.error('❌ Error closing pool during uncaught exception:', closeError);
    }
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    try {
        await DBHelper.closePool();
    } catch (closeError) {
        console.error('❌ Error closing pool during unhandled rejection:', closeError);
    }
    process.exit(1);
});

module.exports = DBHelper; // export แบบ direct class
