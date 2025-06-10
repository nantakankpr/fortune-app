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
        // เช็คว่ามี session และ userData หรือไม่
        if (!req.session || !req.session.userData) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({
                    success: false,
                    error: 'Admin authentication required',
                    redirect: '/admin/login'
                });
            }
            return res.redirect('/admin/login');
        }

        // เช็คว่าเป็น admin role หรือไม่
        const adminRole = req.session.userData.role || req.session.userData.userType;
        if (adminRole !== 'admin') {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }
            return res.status(403).send('Admin access required');
        }

        // เช็คว่า session ยังไม่หมดอายุ (optional)
        if (req.session.userData.expires && new Date() > new Date(req.session.userData.expires)) {
            req.session.destroy();
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({
                    success: false,
                    error: 'Session expired',
                    redirect: '/admin/login'
                });
            }
            return res.redirect('/admin/login');
        }

        // ส่งต่อไปยัง middleware หรือ route handler ถัดไป
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                error: 'Admin authentication check failed' 
            });
        }
        return res.status(500).send('Authentication error');
    }
}

module.exports = {
    csrfProtection,
    auth,                       // สำหรับ user ทั่วไป
    authAdmin,                  // สำหรับ admin เท่านั้น
    requireActiveSubscription,
    optionalSubscriptionCheck
};
