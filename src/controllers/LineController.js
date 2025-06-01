const { client } = require('../services/lineService');

class LineController {
  static async handleWebhook(events) {
    try {
      await Promise.all(events.map(event => LineController.handleEvent(event)));
    } catch (err) {
      console.error('LINE webhook error:', err);
      throw err;
    }
  }

  static async handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') return;
    const userMessage = event.message.text;
    const replyToken = event.replyToken;
  }
}

module.exports = LineController;
