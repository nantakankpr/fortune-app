const SubscriptionModel = require('../models/SubscriptionModel');

class SubscriptionJob {
    /**
     * ปิด subscription ที่หมดอายุ
     */
    static async deactivateExpiredSubscriptions() {
        try {
            console.log('🔄 Running subscription cleanup job...');
            const result = await SubscriptionModel.deactivateExpiredSubscriptions();
            
            if (result.affectedRows > 0) {
                console.log(`✅ Deactivated ${result.affectedRows} expired subscriptions`);
            } else {
                console.log('✅ No expired subscriptions found');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Subscription cleanup job failed:', error);
            throw error;
        }
    }

    /**
     * ทำความสะอาด cache ที่หมดอายุ
     */
    static cleanExpiredCache() {
        try {
            console.log('🧹 Cleaning expired subscription cache...');
            const cleanedCount = SubscriptionModel.cleanExpiredCache();
            
            if (cleanedCount > 0) {
                console.log(`✅ Cleaned ${cleanedCount} expired cache entries`);
            } else {
                console.log('✅ No expired cache entries found');
            }
            
            return cleanedCount;
        } catch (error) {
            console.error('❌ Cache cleanup failed:', error);
            throw error;
        }
    }
}

module.exports = SubscriptionJob;