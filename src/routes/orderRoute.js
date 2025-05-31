const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');
const mdw = require('../middlewares');

router.get('/payment',mdw.auth(['member']), async (req,res) => {
    let userData = req.session.user;
    const paymentData = await PaymentController.createOrderPayment(userData);
    req.session.qrcode = paymentData.qrImageUrl;
    return res.render('user/payment', { userData : req.session.user , paymentData : paymentData });
});

module.exports = router;
