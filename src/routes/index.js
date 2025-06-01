const express = require('express');
const router = express.Router();
const mdw = require('../middlewares');

// Controllers
const WebController = require('../controllers/WebController');
const AuthController = require('../controllers/AuthController');
const PaymentController = require('../controllers/PaymentController');
const BackendController = require('../controllers/BackendController');

// ==================== WEB ROUTES ====================
router.get('/init', mdw.csrfProtection, WebController.showInitPage);
router.get('/register', mdw.csrfProtection, WebController.showRegisterPage);

// ==================== AUTH ROUTES ====================
router.get('/auth/session', AuthController.checkSession);
router.post('/auth/login', mdw.csrfProtection, AuthController.login);
router.post('/auth/register', mdw.csrfProtection, AuthController.register);

// ==================== ORDER/PAYMENT ROUTES ====================
router.get('/order/payment', mdw.auth(['member']), PaymentController.showPaymentPage);
router.post('/order/payment', mdw.auth(['member']), mdw.csrfProtection, PaymentController.createPayment);
router.post('/order/status', mdw.auth(['member']), PaymentController.checkOrderStatus);
router.post('/order/cancel', mdw.auth(['member']), PaymentController.cancelOrder);
router.get('/order/succeeded', mdw.auth(['member']), PaymentController.showOrderSuccessPage);
router.get('/order/canceled', mdw.auth(['member']), PaymentController.showOrderCanceledPage);

// ==================== ADMIN ROUTES ====================
router.get('/admin/login', mdw.csrfProtection, BackendController.showLoginPage);
router.post('/admin/login', mdw.csrfProtection, BackendController.handleLogin);
router.get('/admin/transactions', mdw.auth(['admin']), BackendController.showTransactionsPage);
router.post('/admin/transactions/update', mdw.auth(['admin']), mdw.csrfProtection, BackendController.handleUpdateTransaction);
router.post('/admin/logout', BackendController.handleLogout);

module.exports = router;