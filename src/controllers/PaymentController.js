const { provider } = require('../services/payment');
const { DBHelper } = require('../services/ormService');
const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr')
const UserController = require('../controllers/UserController');

class PaymentController {

  async createOrderPayment(userData) {
    try {
      const recipient = await DBHelper.select('promptpay_recipients', { id: 1 });
      if (!recipient || recipient.length === 0) {
        throw new Error('Account is inactive!');
      }

      const packageData = await DBHelper.select('packages', { id: 1 });
      if (!packageData || packageData.length === 0) {
        throw new Error('package is inactive!');
      }
      // 1. สร้าง PromptPay payload
      const amount = parseFloat(packageData[0].price);
      const payload = generatePayload(recipient[0].phone_number, { amount })
      const url = await QRCode.toDataURL(payload);
      let transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      let created_at = new Date().toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      const transactionData = await DBHelper.select('transactions', {user_id: userData.id, status: 'pending' });
      if (!transactionData || transactionData.length === 0) {
        await DBHelper.insert('transactions',
          {
            transaction_id: transactionId,
            user_id: userData.id,
            package_id: packageData[0].id,
            amount: parseFloat(packageData[0].price),
            recipient_mobile: recipient[0].phone_number,
            recipient_name: recipient[0].full_name,
            status: 'Pending',
          }
        )
      }else{
        transactionId = transactionData[0].transaction_id;
        created_at = new Date(transactionData[0].created_at).toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      const paymentData = {
        transactionId : transactionId,
        amount: parseFloat(packageData[0].price),
        qrImageUrl: url,
        recipient: {
          mobileNumber: recipient[0].phone_number,
          fullName: recipient[0].full_name,
        },
        user: userData,
        package: packageData[0],
        createdAt: created_at
      };
      return paymentData;
    } catch (error) {
      console.error('error:', error.message);
    }

  }

}

module.exports = new PaymentController();
