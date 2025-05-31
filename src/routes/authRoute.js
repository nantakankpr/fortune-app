const express = require('express');
const router = express.Router();
const mdw = require('../middlewares');
const UserController = require('../controllers/UserController');
const { verifyIdToken } = require("../services/lineService");
const PaymentController = require('../controllers/PaymentController');
const { DBHelper } = require('../services/ormService');

router.get('/session', (req, res) => {
    if (req.session && req.session.user) {
        if(req.session.user.subscriptionData && req.session.user.subscriptionData.length > 0){
            return res.json({ loggedIn: true, user: req.session.user });
        }
    }
    return res.json({ loggedIn: false });
});

router.post('/login', mdw.csrfProtection, async (req, res) => {

    const idToken = req.headers["authorization"] ? req.headers["authorization"].replace("Bearer ", "") : req.body.idToken;
    if (!idToken || typeof idToken !== "string") {
        return res.status(401).json({ error: "Missing or invalid ID token" });
    }

    try {
        // ตรวจสอบ token
        const userData = await verifyIdToken(idToken);

        // ค้นหาผู้ใช้ในระบบ
        const users = await UserController.findByUserId(userData.sub);
        if (!users || users.length === 0) {
            return res.json({ success: true, userData: userData, redirect: '/register' });
        }

        const subscriptionData = await DBHelper.select('subscriptions', { user_id: users[0].id })

        req.session.user = {
            id: userData.sub,
            line_name: userData.name,
            full_name: users[0].full_name,
            birth_date: users[0].birth_date,
            phone: users[0].phone,
            created_at: users[0].created_at,
            picture: userData.picture,
            subscriptionData : subscriptionData
        };
        req.session.user.role = 'member';

        if (!subscriptionData || subscriptionData.length === 0) {
            return res.json({success : true , redirect : 'order/payment'});
        } else {
            return res.json({success : true});
        }

    } catch (error) {
        console.log("error:", error.message);
        return res.status(401).json({ error: "Login failed" });
    }
});


router.post('/register', mdw.csrfProtection, async (req, res) => {
    const idToken = req.headers["authorization"] ? req.headers["authorization"].replace("Bearer ", "") : req.body.idToken;
    if (!idToken) {
        return res.status(400).json({ error: 'Missing idToken' });
    }

    const full_name = (req.body.full_name || '').trim();
    const phone = (req.body.phone || '').trim();
    const birth_date = (req.body.birth_date || '').trim();

    // ตรวจสอบชื่อเต็ม
    // ชื่อเต็มต้องมีความยาว 2-50 ตัวอักษร และไม่สามารถมี < หรือ > ได้
    if (!full_name || /[<>]/.test(full_name)) {
        return res.status(400).json({ error: 'Invalid name' });
    }

    // ตรวจสอบเบอร์โทรศัพท์ไทย
    // เบอร์โทรศัพท์ไทยต้องเริ่มด้วย 0 และตามด้วย 8, 6, 9 และมีความยาว 10 หลัก
    if (!/^0[689]\d{8}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid Thai phone number' });
    }

    // 2023-10-01
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
        return res.status(400).json({ error: 'Invalid birth date format' });
    }
    const birthDate = new Date(birth_date);
    if (birthDate > new Date()) {
        return res.status(400).json({ error: 'Birth date cannot be in the future' });
    }

    try {
        const userData = await verifyIdToken(idToken);
        const result = await UserController.createUser(userData.sub, userData.name, full_name, phone, birth_date, userData.picture);
        if (!result) throw new Error();
        const users = await UserController.findByUserId(userData.sub);
        req.session.user = {
            id: userData.sub,
            line_name: userData.name,
            full_name: users[0].full_name,
            birth_date: users[0].birth_date,
            phone: users[0].phone,
            created_at: users[0].created_at,
            picture: userData.picture,
            package: null
        };
        req.session.user.role = 'member';
        return res.json({success : true , redirect : 'order/payment'});
    } catch (e) {
        return res.status(401).json({ error: "Invalid token or failed to create user" });
    }
});


module.exports = router;