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

// Authentication middleware สำหรับ user ทั่วไป
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

// Admin Authentication middleware - เช็คจาก req.session.userData
function authAdmin(req, res, next) {
    try {
        if (!req.session || !req.session.userData || req.session.userData.role !== 'admin') {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }
            return res.redirect('/admin/login');
        }
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({ error: 'Admin authentication check failed' });
    }
}

module.exports = {
    csrfProtection,
    auth,                       // สำหรับ user ทั่วไป
    authAdmin,                  // สำหรับ admin เท่านั้น
    requireActiveSubscription,
    optionalSubscriptionCheck
};
