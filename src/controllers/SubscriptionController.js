const SubscriptionModel = require('../models/SubscriptionModel');

class SubscriptionController {
    
    /**
     * ตรวจสอบว่า user มี subscription ที่ active อยู่หรือไม่
     */
    static async hasActiveSubscription(userId) {
        try {
            const subscription = await SubscriptionModel.getActiveSubscription(userId);
            return subscription !== null;
        } catch (error) {
            console.error('Error checking active subscription:', error);
            return false;
        }
    }

    /**
     * ดึงข้อมูล subscription ที่ active
     */
    static async getActiveSubscription(userId, useCache = true) {
        try {
            return await SubscriptionModel.getActiveSubscription(userId, useCache);
        } catch (error) {
            console.error('Error getting active subscription:', error);
            throw error;
        }
    }

    /**
     * สร้าง subscription ใหม่
     */
    static async createSubscription(userId, packageId, packageData) {
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(packageData.duration));

            const subscriptionData = {
                user_id: userId,
                package_id: packageId,
                package_name: packageData.name,
                is_active: 1,
                start_date: startDate,
                end_date: endDate,
                created_at: new Date()
            };

            return await SubscriptionModel.createSubscription(subscriptionData);
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }

    /**
     * ต่ออายุ subscription
     */
    static async extendSubscription(userId, additionalDays) {
        try {
            const currentSubscription = await SubscriptionModel.getActiveSubscription(userId);
            
            if (!currentSubscription) {
                throw new Error('No active subscription found');
            }

            const newEndDate = new Date(currentSubscription.end_date);
            newEndDate.setDate(newEndDate.getDate() + parseInt(additionalDays));

            return await SubscriptionModel.updateSubscription(userId, {
                end_date: newEndDate,
                updated_at: new Date()
            });
        } catch (error) {
            console.error('Error extending subscription:', error);
            throw error;
        }
    }
}

module.exports = SubscriptionController;