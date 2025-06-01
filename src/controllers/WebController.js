const config = require('../config/config');

class WebController {
    static async showInitPage(req, res) {
        try {
            res.render('user/init', {
                title: 'Fortune application',
                csrfToken: req.csrfToken(),
                config: {
                    liffId: config.LIFF_ID,
                    nodeEnv: config.NODE_ENV,
                }
            });
        } catch (error) {
            console.error("Init page error:", error);
            res.status(500).render('error', { 
                title: 'Error',
                message: 'Internal server error' 
            });
        }
    }

    static async showRegisterPage(req, res) {
        try {
            // ถ้า login แล้วให้ไปหน้า payment
            if (req.session && req.session.user) {
                return res.redirect('/order/payment');
            }

            res.render('user/register', {
                title: 'Fortune application',
                csrfToken: req.csrfToken(),
                config: {
                    liffId: config.LIFF_ID,
                    nodeEnv: config.NODE_ENV,
                }
            });
        } catch (error) {
            console.error("Register page error:", error);
            res.status(500).render('error', { 
                title: 'Error',
                message: 'Internal server error' 
            });
        }
    }
}

module.exports = WebController;