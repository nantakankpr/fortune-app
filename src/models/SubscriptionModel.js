const DBHelper = require('../services/ormService');

class SubscriptionModel {
    
    /**
     * ตรวจสอบว่า user มี subscription ที่ active อยู่หรือไม่
     */
    static async hasActiveSubscription(userId) {
        try {
            
            const query = `
                SELECT COUNT(*) as count
                FROM subscriptions 
                WHERE user_id = ? 
                AND is_active = 1 
                AND end_date > NOW()
            `;
            
            const result = await DBHelper.query(query, [userId]);
            const hasActive = result && result[0] && result[0].count > 0;
            return hasActive;
        } catch (error) {
            console.error('❌ Database error in hasActiveSubscription:', error);
            return false;
        }
    }

    /**
     * ดึงข้อมูล subscription ที่ active
     */
    static async getActiveSubscription(userId) {
        try {
            
            const query = `
                SELECT s.*, p.name as package_display_name, p.price as package_price, p.duration as package_duration
                FROM subscriptions s
                LEFT JOIN packages p ON s.package_id = p.id
                WHERE s.user_id = ? 
                AND s.is_active = 1 
                AND s.end_date > NOW()
                ORDER BY s.created_at DESC
                LIMIT 1
            `;
            
            const result = await DBHelper.query(query, [userId]);
            const subscription = result && result.length > 0 ? result[0] : null;
            
            return subscription;
        } catch (error) {
            console.error('❌ Database error in getActiveSubscription:', error);
            return null;
        }
    }

    /**
     * สร้าง subscription ใหม่
     */
    static async createSubscription(subscriptionData) {
        try {
            // ตรวจสอบและทำความสะอาดข้อมูล
            const cleanData = {
                user_id: subscriptionData.user_id,
                package_id: subscriptionData.package_id,
                package_name: subscriptionData.package_name || null,
                package_display_name: subscriptionData.package_display_name || subscriptionData.package_name || null,
                package_duration: subscriptionData.package_duration ? parseInt(subscriptionData.package_duration) : null,
                package_price: subscriptionData.package_price ? parseFloat(subscriptionData.package_price) : 0,
                is_active: subscriptionData.is_active !== undefined ? subscriptionData.is_active : 1,
                start_date: subscriptionData.start_date || new Date(),
                end_date: subscriptionData.end_date || new Date(),
                created_at: subscriptionData.created_at || new Date(),
                updated_at: subscriptionData.updated_at || new Date()
            };

            // ตรวจสอบข้อมูลที่จำเป็น
            if (!cleanData.user_id || !cleanData.package_id) {
                throw new Error('Missing required fields: user_id and package_id');
            }

            const result = await DBHelper.insert('subscriptions', cleanData);
            return result;
        } catch (error) {
            console.error('❌ Database error in createSubscription:', error);
            throw error;
        }
    }

    /**
     * ปิด subscription ที่หมดอายุแล้ว
     */
    static async deactivateExpiredSubscriptions() {
        try {
            const query = `
                UPDATE subscriptions 
                SET is_active = 0, updated_at = NOW()
                WHERE is_active = 1 
                AND end_date <= NOW()
            `;
            
            const result = await DBHelper.query(query);
            return result.affectedRows;
        } catch (error) {
            console.error('❌ Error deactivating expired subscriptions:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูล subscription ที่หมดอายุแล้ว
     */
    static async getExpiredSubscription(userId) {
        try {
            const query = `
                SELECT 
                    s.*,
                    s.package_name as package_display_name
                FROM subscriptions s 
                WHERE s.user_id = ? 
                AND s.end_date < NOW()
                ORDER BY s.end_date DESC 
                LIMIT 1
            `;
            
            const result = await DBHelper.query(query, [userId]);
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('❌ Error in getExpiredSubscription:', error);
            throw error;
        }
    }
}

module.exports = SubscriptionModel;