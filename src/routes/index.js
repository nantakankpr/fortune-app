const express = require('express');
const router = express.Router();
const mdw = require('../middlewares');
const WebController = require('../controllers/WebController');
const AuthController = require('../controllers/AuthController');
const PaymentController = require('../controllers/PaymentController');
const BackendController = require('../controllers/BackendController');
const FortuneController = require('../controllers/FortuneController');

// ==================== WEB ROUTES ====================
// router.get('/nctv4', function(req, res) {
//  res.render('user/test',{});
// });
//hello world
router.get('/', (req, res) => {
  return res.send('Hello World');
});
router.get('/init', mdw.csrfProtection, WebController.showInitPage);
router.get('/register', mdw.csrfProtection, WebController.showRegisterPage);

// ==================== AUTH ROUTES ====================
router.get('/auth/session', AuthController.checkSession);
router.post('/auth/login', mdw.csrfProtection, AuthController.login);
router.post('/auth/register', mdw.csrfProtection, AuthController.register);

// ==================== ORDER ROUTES ====================
// Payment Routes
router.get('/order/payment', mdw.auth(['member']), mdw.csrfProtection, PaymentController.showPaymentPage);
router.post('/order/payment', mdw.auth(['member']), mdw.csrfProtection, PaymentController.createPayment);

// Renewal Routes
router.get('/order/renew', mdw.auth(['member']), mdw.csrfProtection, PaymentController.showRenewPage);
router.post('/order/renew', mdw.auth(['member']), mdw.csrfProtection, PaymentController.renewSubscription);

// Status & Management Routes
router.post('/order/status', mdw.auth(['member']), PaymentController.checkOrderStatus);

// Success & Result Pages
router.get('/order/succeeded', mdw.auth(['member']), PaymentController.showOrderSuccessPage);
router.get('/order/renew-success', mdw.auth(['member']), PaymentController.showRenewSuccessPage);

// ==================== ADMIN ROUTES ====================
router.post('/admin/add',mdw.authAdmin, BackendController.handleAddUser);
router.get('/admin/login', mdw.csrfProtection, BackendController.showLoginPage);
router.post('/admin/login', mdw.csrfProtection, BackendController.handleLogin);
router.post('/admin/logout', mdw.authAdmin, BackendController.handleLogout);
router.get('/admin/transactions', mdw.authAdmin, BackendController.showTransactionsPage);
router.post('/admin/transactions/update', mdw.authAdmin, mdw.csrfProtection, BackendController.handleUpdateTransaction);
router.get('/admin/fortune-test', mdw.authAdmin, FortuneController.showTestPage);

// ==================== ADMIN API ROUTES ====================
router.post('/admin/api/fortune/broadcast', mdw.authAdmin, FortuneController.testBroadcast);
router.post('/admin/api/fortune/create', mdw.authAdmin, FortuneController.createFortuneForUser);
router.get('/admin/api/fortune/user', mdw.authAdmin, FortuneController.getUserFortune);

module.exports = router;