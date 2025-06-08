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

        // ตรวจสอบ subscription แบบ real-time ผ่าน cache ใน SubscriptionModel
        const hasActive = await SubscriptionController.hasActiveSubscription(req.session.user.id);
        
        if (!hasActive) {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required',
                redirect: '/order/payment'
            });
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
 * Middleware สำหรับ pages ที่ต้องการข้อมูล subscription แต่ไม่บังคับ
 */
async function optionalSubscriptionCheck(req, res, next) {
    try {
        if (req.session?.user?.id) {
            const hasActive = await SubscriptionController.hasActiveSubscription(req.session.user.id);
            req.hasActiveSubscription = hasActive;
            
            if (hasActive) {
                const activeSubscription = await SubscriptionController.getActiveSubscription(req.session.user.id);
                req.subscriptionData = activeSubscription;
            }
        }
        next();
    } catch (error) {
        console.error('Optional subscription check error:', error);
        req.hasActiveSubscription = false;
        req.subscriptionData = null;
        next(); // ไม่ block request
    }
}

module.exports = {
    requireActiveSubscription,
    optionalSubscriptionCheck
};