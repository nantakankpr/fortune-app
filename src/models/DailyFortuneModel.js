const DBHelper = require('../services/ormService');

class DailyFortuneModel {
    /**
     * ดึงข้อมูล daily fortune ของ user ในวันที่กำหนด
     */
    static async getDailyFortune(userId, fortuneDate = null) {
        try {
            const targetDate = fortuneDate || new Date().toISOString().split('T')[0];
            const fortunes = await DBHelper.query(`
                SELECT * FROM daily_fortunes 
                WHERE user_id = ? AND fortune_date = ?
                LIMIT 1
            `, [userId, targetDate]);

            return fortunes.length > 0 ? fortunes[0] : null;
        } catch (error) {
            console.error('Error getting daily fortune:', error);
            throw error;
        }
    }

    /**
     * ดึงรายชื่อ user ที่มี subscription active และมี daily fortune วันนี้
     */
    static async getUsersWithTodayFortune() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const users = await DBHelper.query(`
                SELECT DISTINCT 
                    u.line_user_id as user_id,
                    u.line_name,
                    u.full_name,
                    df.content,
                    df.category,
                    df.zodiac
                FROM users u
                INNER JOIN subscriptions s ON u.line_user_id = s.user_id
                INNER JOIN daily_fortunes df ON u.line_user_id = df.user_id
                WHERE s.is_active = 1 
                AND (s.end_date IS NULL OR s.end_date > NOW())
                AND df.fortune_date = ?
            `, [today]);

            return users;
        } catch (error) {
            console.error('Error getting users with today fortune:', error);
            throw error;
        }
    }

    /**
     * สร้าง daily fortune ใหม่
     */
    static async createDailyFortune(fortuneData) {
        try {
            return await DBHelper.insert('daily_fortunes', fortuneData);
        } catch (error) {
            console.error('Error creating daily fortune:', error);
            throw error;
        }
    }
}

module.exports = DailyFortuneModel;