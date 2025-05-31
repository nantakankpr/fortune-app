const express = require('express');
const { line, config } = require('../services/lineService');
const LineController = require('../controllers/LineController');

const router = express.Router();

router.post('/', line.middleware(config), async (req, res) => {
  try {
    await LineController.handleWebhook(req.body.events);
    res.status(200).end();
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).end();
  }
});

module.exports = router;
