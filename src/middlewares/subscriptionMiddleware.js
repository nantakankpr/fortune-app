const SubscriptionController = require('../controllers/SubscriptionController');

/**
 * Middleware สำหรับเช็คว่า user มี subscription ที่ active อยู่หรือไม่
 */
async function requireActiveSubscription(req, res, next) {
    try {
        if (!req.session || !req.session.user || !req.session.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                redirect: '/init'
            });
        }

        const hasActive = await SubscriptionController.hasActiveSubscription(req.session.user.id);
        
        if (!hasActive) {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required',
                redirect: '/order/payment'
            });
        }

        // อัพเดท subscription data ใน session ถ้าจำเป็น
        if (!req.session.user.subscriptionData) {
            const activeSubscription = await SubscriptionController.getActiveSubscription(req.session.user.id);
            req.session.user.subscriptionData = activeSubscription;
        }

        next();
    } catch (error) {
        console.error('Subscription middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check subscription status'
        });
    }
}

/**
 * Middleware สำหรับเช็คและอัพเดท subscription status
 */
async function refreshSubscriptionStatus(req, res, next) {
    try {
        if (req.session.user && req.session.user.id) {
            // ดึงข้อมูล subscription ใหม่ (ไม่ใช้ cache)
            const activeSubscription = await SubscriptionController.getActiveSubscription(req.session.user.id, false);
            req.session.user.subscriptionData = activeSubscription;
        }
        next();
    } catch (error) {
        console.error('Refresh subscription middleware error:', error);
        next(); // ให้ continue ต่อไปแม้มี error
    }
}

module.exports = {
    requireActiveSubscription,
    refreshSubscriptionStatus
};