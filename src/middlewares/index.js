const csrf = require('csurf');
const { requireActiveSubscription, optionalSubscriptionCheck } = require('./subscriptionMiddleware');

// CSRF Protection
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// Authentication middleware
function auth(allowedRoles = []) {
    return (req, res, next) => {
        try {
            if (!req.session || !req.session.user) {
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required',
                        redirect: '/init'
                    });
                }
                return res.redirect('/init');
            }

            const userRole = req.session.user.role || 'member';
            
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                return res.status(403).send('Access denied');
            }

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ error: 'Authentication check failed' });
        }
    };
}

module.exports = {
    csrfProtection,
    auth,
    requireActiveSubscription,  // ✅ export ตัวนี้จาก subscriptionMiddleware
    optionalSubscriptionCheck   // ✅ export ตัวนี้จาก subscriptionMiddleware
};
