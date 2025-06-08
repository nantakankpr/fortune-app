const SubscriptionModel = require('../models/SubscriptionModel');
const TransactionModel = require('../models/TransactionModel');
const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr');
const config = require('../config/config');

class SubscriptionController {
    
    /**
     * ตรวจสอบว่า user มี subscription ที่ active อยู่หรือไม่
     */
    static async hasActiveSubscription(userId) {
        try {
            const result = await SubscriptionModel.hasActiveSubscription(userId);
            return result;
        } catch (error) {
            console.error('❌ Error checking subscription:', error);
            return false;
        }
    }

    /**
     * ดึงข้อมูล subscription ที่ active
     */
    static async getActiveSubscription(userId) {
        try {
            const result = await SubscriptionModel.getActiveSubscription(userId);
            return result;
        } catch (error) {
            console.error('❌ Error getting active subscription:', error);
            return null;
        }
    }

    /**
     * ดึง subscription ล่าสุด (ไม่ว่าจะ active หรือไม่)
     */
    static async getLastSubscription(userId) {
        try {
            const result = await SubscriptionModel.getLastSubscription(userId);
            return result;
        } catch (error) {
            console.error('❌ Error in SubscriptionController.getLastSubscription:', error);
            return null;
        }
    }

    /**
     * สร้าง subscription ใหม่
     */
    static async createSubscription(userId, packageId, packageData) {
        try {
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!userId || !packageId || !packageData) {
                throw new Error('Missing required subscription data');
            }

            if (!packageData.name || !packageData.duration) {
                throw new Error('Invalid package data');
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(packageData.duration));

            const subscriptionData = {
                user_id: userId,
                package_id: packageId,
                package_name: packageData.name,
                package_display_name: packageData.name,
                package_duration: parseInt(packageData.duration),
                package_price: parseFloat(packageData.price) || 0,
                is_active: 1,
                start_date: startDate,
                end_date: endDate,
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await SubscriptionModel.createSubscription(subscriptionData);
            return result;
        } catch (error) {
            console.error('❌ Error creating subscription:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูล subscription ที่หมดอายุแล้ว
     */
    static async getExpiredSubscription(userId) {
        try {
            const result = await SubscriptionModel.getExpiredSubscription(userId);
            return result;
        } catch (error) {
            console.error('❌ Error in SubscriptionController.getExpiredSubscription:', error);
            return null;
        }
    }
}

module.exports = SubscriptionController;