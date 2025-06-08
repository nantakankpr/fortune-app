const UserController = require('./UserController');
const SubscriptionController = require('./SubscriptionController');
const { verifyIdToken } = require("../services/lineService");

class AuthController {
    static async checkSession(req, res) {
        try {
            if (req.session && req.session.user) {
                const userId = req.session.user.id;
                
                // เช็คสถานะ subscription แบบครบถ้วน
                const hasActiveSubscription = await SubscriptionController.hasActiveSubscription(userId);
                const expiredSubscription = await SubscriptionController.getExpiredSubscription(userId);
                
                // กำหนดสถานะและ redirect URL
                let subscriptionStatus = 'none'; // none, active, expired
                let suggestedRedirect = '/order/payment';
                
                if (hasActiveSubscription) {
                    subscriptionStatus = 'active';
                    suggestedRedirect = '/order/succeeded';
                } else if (expiredSubscription) {
                    subscriptionStatus = 'expired';
                    suggestedRedirect = '/order/renew';
                }
                
                return res.json({
                    loggedIn: true,
                    user: req.session.user,
                    hasSubscription: hasActiveSubscription, // backward compatibility
                    subscription: {
                        status: subscriptionStatus,
                        hasActive: hasActiveSubscription,
                        hasExpired: !!expiredSubscription,
                        canRenew: !hasActiveSubscription && !!expiredSubscription,
                        canPurchase: !hasActiveSubscription && !expiredSubscription
                    },
                    suggestedRedirect: suggestedRedirect
                });
            }
            return res.json({ loggedIn: false });
        } catch (error) {
            console.error("❌ Session check error:", error);
            return res.status(500).json({ error: "Session check failed" });
        }
    }

    static async login(req, res) {
        const idToken = req.headers["authorization"] ?
            req.headers["authorization"].replace("Bearer ", "") :
            req.body.idToken;

        if (!idToken || typeof idToken !== "string") {
            return res.status(401).json({ error: "Missing or invalid ID token" });
        }

        try {
            const userData = await verifyIdToken(idToken);
            const users = await UserController.findByUserId(userData.sub);

            // ถ้าไม่มี user ให้ไปหน้า register
            if (!users || users.length === 0) {
                return res.json({
                    success: true,
                    userData: userData,
                    redirect: '/register'
                });
            }

            // เก็บข้อมูล user ใน session
            req.session.user = {
                id: userData.sub,
                line_name: userData.name,
                full_name: users[0].full_name,
                birth_date: users[0].birth_date,
                phone: users[0].phone,
                created_at: users[0].created_at,
                picture: userData.picture,
                role: 'member'
            };

            // ตรวจสอบ subscription และ redirect ตามสถานะ
            const hasActiveSubscription = await SubscriptionController.hasActiveSubscription(userData.sub);

            if (hasActiveSubscription) {
                // มี subscription ที่ active อยู่
                return res.json({
                    success: true,
                    redirect: '/order/succeeded'
                });
            } else {
                // ไม่มี active subscription - เช็คว่ามี expired subscription หรือไม่
                const expiredSubscription = await SubscriptionController.getExpiredSubscription(userData.sub);
                if (expiredSubscription) {
                    // มี subscription ที่หมดอายุ - redirect ไปหน้าต่ออายุ
                    return res.json({
                        success: true,
                        redirect: '/order/renew'
                    });
                } else {
                    // ไม่มี subscription เลย - redirect ไปหน้าสมัครใหม่
                    return res.json({
                        success: true,
                        redirect: '/order/payment'
                    });
                }
            }

        } catch (error) {
            console.error("❌ Login error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    static validateRegistration(full_name, phone, birth_date) {
        // Name validation
        if (!full_name || full_name.length < 2 || full_name.length > 50 || /[<>]/.test(full_name)) {
            return { isValid: false, error: 'Name must be 2-50 characters and cannot contain < or >' };
        }

        // Phone validation
        if (!/^0[689]\d{8}$/.test(phone)) {
            return { isValid: false, error: 'Invalid Thai phone number format' };
        }

        // Date format validation
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
            return { isValid: false, error: 'Invalid birth date format (YYYY-MM-DD)' };
        }

        // Date validation
        const [year, month, day] = birth_date.split('-').map(Number);
        const today = new Date();
        const currentYear = today.getFullYear() + 543;

        if (year > currentYear) {
            return { isValid: false, error: 'Birth date cannot be in the future' };
        }

        if (year === currentYear) {
            const currentMonth = today.getMonth() + 1;
            const currentDay = today.getDate();

            if (month > currentMonth || (month === currentMonth && day > currentDay)) {
                return { isValid: false, error: 'Birth date cannot be in the future' };
            }
        }

        return { isValid: true };
    }

    static async register(req, res) {
        const idToken = req.headers["authorization"] ?
            req.headers["authorization"].replace("Bearer ", "") :
            req.body.idToken;

        if (!idToken) {
            return res.status(400).json({ error: 'Missing idToken' });
        }

        const full_name = (req.body.full_name || '').trim();
        const phone = (req.body.phone || '').trim();
        const birth_date = (req.body.birth_date || '').trim();

        // Validation
        const validation = AuthController.validateRegistration(full_name, phone, birth_date);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        try {
            const userData = await verifyIdToken(idToken);

            // ตรวจสอบว่า user มีอยู่แล้วหรือไม่
            const existingUsers = await UserController.findByUserId(userData.sub);
            if (existingUsers && existingUsers.length > 0) {
                return res.status(409).json({ error: 'User already exists' });
            }

            const result = await UserController.createUser(
                userData.sub,
                userData.name,
                full_name,
                phone,
                birth_date,
                userData.picture
            );

            if (!result) {
                throw new Error('Failed to create user');
            }

            const users = await UserController.findByUserId(userData.sub);
            
            // เก็บข้อมูล user ใน session
            req.session.user = {
                id: userData.sub,
                line_name: userData.name,
                full_name: users[0].full_name,
                birth_date: users[0].birth_date,
                phone: users[0].phone,
                created_at: users[0].created_at,
                picture: userData.picture,
                role: 'member'
            };

            return res.json({ success: true, redirect: '/order/payment' });
        } catch (error) {
            console.error("❌ Registration error:", error);
            return res.status(500).json({ error: "Registration failed" });
        }
    }
}

module.exports = AuthController;