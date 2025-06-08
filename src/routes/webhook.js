const express = require('express');
const router = express.Router();
const LineController = require('../controllers/LineController');
const PaymentController = require('../controllers/PaymentController');
const {line,config} = require('../services/lineService');

// ==================== WEBHOOK ROUTES ====================
router.post('/line/webhook', line.middleware(config), LineController.handleWebhook);

module.exports = router;
