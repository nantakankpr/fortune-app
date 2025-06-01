const {DBHelper} = require('../services/ormService');

class SubscriptionModel {
    static cache = new Map();
    static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    static getCacheKey(userId) {
        return `subscription_${userId}`;
    }

    /**
     * เช็คว่า cache หมดอายุหรือยัง
     */
    static isCacheExpired(cacheData) {
        return Date.now() > cacheData.expireTime;
    }

    /**
     * สร้าง cache data พร้อม expire time
     */
    static createCacheData(data) {
        return {
            data: data,
            expireTime: Date.now() + this.CACHE_DURATION,
            userId: data ? data.user_id : null
        };
    }

    /**
     * ดึงข้อมูล subscription ที่ยังไม่หมดอายุ พร้อม cache
     */
    static async getActiveSubscription(userId, useCache = true) {
        const cacheKey = this.getCacheKey(userId);
        
        // ตรวจสอบ cache ก่อน
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            
            // ถ้า cache ยังไม่หมดอายุ
            if (!this.isCacheExpired(cached)) {
                return cached.data;
            } else {
                // ถ้า cache หมดอายุแล้วให้ลบออก
                this.cache.delete(cacheKey);
            }
        }

        try {
            const subscriptions = await DBHelper.query(`
                SELECT s.*, p.display_name as package_display_name, p.duration_days as package_duration, p.price as package_price
                FROM subscriptions s 
                LEFT JOIN packages p ON s.package_id = p.id 
                WHERE s.user_id = ? 
                AND s.is_active = 1 
                AND (s.end_date IS NULL OR s.end_date > NOW())
                LIMIT 1
            `, [userId]);

            const activeSubscription = subscriptions.length > 0 ? subscriptions[0] : null;

            // บันทึกลง cache พร้อม expire time
            const cacheData = this.createCacheData(activeSubscription);
            this.cache.set(cacheKey, cacheData);
            
            return activeSubscription;
        } catch (error) {
            console.error('Error getting active subscription:', error);
            throw error;
        }
    }

    /**
     * สร้าง subscription ใหม่
     */
    static async createSubscription(subscriptionData) {
        try {
            const result = await DBHelper.insert('subscriptions', subscriptionData);
            
            // ลบ cache ของ user นี้เฉพาะ
            this.clearUserCache(subscriptionData.user_id);
            
            return result;
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }

    /**
     * อัพเดท subscription
     */
    static async updateSubscription(userId, updateData) {
        try {
            const result = await DBHelper.update('subscriptions', updateData, { user_id: userId });
            
            // ลบ cache ของ user นี้เฉพาะ
            this.clearUserCache(userId);
            
            return result;
        } catch (error) {
            console.error('Error updating subscription:', error);
            throw error;
        }
    }

    /**
     * ปิด subscription ที่หมดอายุ
     */
    static async deactivateExpiredSubscriptions() {
        try {
            const result = await DBHelper.query(`
                UPDATE subscriptions 
                SET is_active = 0, updated_at = NOW() 
                WHERE is_active = 1 
                AND end_date < NOW()
            `);
            
            // ลบ cache ที่เกี่ยวข้อง โดยดูจาก affected rows
            if (result.affectedRows > 0) {
                this.clearAllCache();
            }
            
            return result;
        } catch (error) {
            console.error('Error deactivating expired subscriptions:', error);
            throw error;
        }
    }

    /**
     * ลบ cache ของ user คนใดคนหนึ่ง
     */
    static clearUserCache(userId) {
        const cacheKey = this.getCacheKey(userId);
        if (this.cache.has(cacheKey)) {
            this.cache.delete(cacheKey);
        }
    }

    /**
     * ลบ cache ทั้งหมด
     */
    static clearAllCache() {
        this.cache.clear();
    }

    /**
     * ลบ cache ที่หมดอายุอัตโนมัติ
     */
    static cleanExpiredCache() {
        let cleanedCount = 0;
        
        for (const [key, cacheData] of this.cache.entries()) {
            if (this.isCacheExpired(cacheData)) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        return cleanedCount;
    }
}

module.exports = SubscriptionModel;