const { provider, EasySlipService } = require('../services/payment');
const { DBHelper } = require('../services/ormService');
const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr');
const UserController = require('../controllers/UserController');
const TransactionModel = require('../models/TransactionModel');
const config = require('../config/config');
const SubscriptionController = require('./SubscriptionController');

class PaymentController {

  static async createOrderPayment(userData) {
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
      const payload = generatePayload(recipient[0].phone_number, { amount });
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

      const transactionData = await DBHelper.select('transactions', { user_id: userData.id, status: 'pending' });

      if (!transactionData || transactionData.length === 0) {
        await DBHelper.insert('transactions', {
          transaction_id: transactionId,
          user_id: userData.id,
          package_id: packageData[0].id,
          amount: parseFloat(packageData[0].price),
          recipient_mobile: recipient[0].phone_number,
          recipient_name: recipient[0].full_name,
          status: 'Pending',
        });
      } else {
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
        transactionId: transactionId,
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
      console.error('createOrderPayment error:', error.message);
      throw error; // ส่ง error ต่อให้ caller handle
    }
  }

  static async showPaymentPage(req, res) {
    try {
      const userData = req.session.user;
      const paymentData = await PaymentController.createOrderPayment(userData);
      req.session.qrcode = paymentData.qrImageUrl;

      res.render('user/payment', {
        title: 'Payment',
        userData: userData,
        paymentData: paymentData,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        }
      });
    } catch (error) {
      console.error("Payment page error:", error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Payment initialization failed'
      });
    }
  }

  static async createPayment(req, res) {
    try {
      const userData = req.session.user;
      if (typeof req.session.user.subscriptionData !== 'object' || Object.keys(req.session.user.subscriptionData).length === 0) {
        // redirect to payment page if user already has a subscription
        return res.redirect('/order/successed');
      }
      const paymentData = await PaymentController.createOrderPayment(userData);

      res.json({
        success: true,
        paymentData: paymentData
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  static async handlePaymentWebhook(req, res) {
    try {
      // Logic สำหรับ handle payment webhook
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Payment webhook error:", error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  // Function สำหรับ verify payment data
  static verifyPaymentData(verificationResult, transactionData) {
    if (!verificationResult.success) {
      return {
        success: false,
        allVerified: false,
        message: verificationResult.error || 'Unable to verify payment at this time'
      };
    }

    let paymentData = verificationResult.data; // ข้อมูลจาก EasySlip API
    let accountInfo = paymentData.receiver.account;
    // ตรวจสอบวันที่
    const dateValid = new Date(paymentData.date) >= new Date(transactionData.created_at);
    // ตรวจสอบจำนวนเงิน
    const amountValid = parseFloat(paymentData.amount.amount) === parseFloat(transactionData.amount);
    // ตรวจสอบชื่อบัญชี - แยกคำและเปรียบเทียบ
    let nameMatches = false;
    if (accountInfo && accountInfo.name && transactionData.recipient_name) {
      const slipNameParts = accountInfo.name.th.toLowerCase().trim().split(/\s+/);
      const recipientNameParts = transactionData.recipient_name.toLowerCase().trim().split(/\s+/);
      // ตรวจสอบว่ามีคำใดคำหนึ่งตรงกันหรือไม่
      nameMatches = slipNameParts.some(slipPart =>
        recipientNameParts.some(recipientPart =>
          slipPart.includes(recipientPart) || recipientPart.includes(slipPart)
        )
      );
    }
    // ตรวจสอบเบอร์โทรศัพท์ - เอาแค่ตัวเลขและเปรียบเทียบ 4 ตัวสุดท้าย
    let phoneMatches = false;
    if (accountInfo && accountInfo.proxy && transactionData.recipient_mobile) {
      const slipPhone = accountInfo.proxy.account.replace(/\D/g, ''); // เอาแค่ตัวเลข
      const recipientPhone = transactionData.recipient_mobile.replace(/\D/g, ''); // เอาแค่ตัวเลข
      if (slipPhone.length >= 4 && recipientPhone.length >= 4) {
        const slipLast4 = slipPhone.slice(-4);
        const recipientLast4 = recipientPhone.slice(-4);
        phoneMatches = slipLast4 === recipientLast4;

      }
    }

    let errorMessage = '';
    const errors = [];
    if (!dateValid) errors.push('วันที่ไม่ถูกต้อง');
    if (!amountValid) errors.push('จำนวนเงินไม่ถูกต้อง');
    if (!nameMatches) errors.push('ชื่อบัญชีไม่ตรงกัน');
    if (!phoneMatches) errors.push('เบอร์โทรศัพท์ไม่ตรงกัน');
    errorMessage = 'ข้อมูลในสลิปไม่ตรงกับรายการโอน: ' + errors.join(', ');
    // รวมผลการตรวจสอบทั้งหมด
    const allVerified = dateValid && amountValid && nameMatches && phoneMatches;
    return {
      success: true,
      allVerified,
      dateValid,
      amountValid,
      nameMatches,
      phoneMatches,
      message: allVerified ? 'Payment verified successfully' : errorMessage,
      paymentData
    };
  }

  static async checkOrderStatus(req, res) {
    try {
      const { transactionId } = req.body;
      const userData = req.session.user;
      const slipImage = req.files ? req.files.slipImage : null;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required',
          debug: { body: req.body, files: req.files }
        });
      }

      // ดึงข้อมูล transaction
      const transaction = await TransactionModel.getTransactionById(transactionId, userData.id);

      if (!transaction || transaction.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      const transactionData = transaction[0];

      // If slip image is provided, save it and add to transaction data
      if (slipImage) {
        const slipBuffer = slipImage.data;
        const slipBase64 = slipBuffer.toString('base64');
        transactionData.slip_payload = slipBase64;
      }

      // เช็คสถานะกับ EasySlip API ผ่าน service
      const verificationResult = await EasySlipService.verifyPayment(transactionData);
      const verifyResult = PaymentController.verifyPaymentData(verificationResult, transactionData);

      if (verifyResult.success && verifyResult.allVerified) {
        // อัพเดทสถานะเป็น completed
        await DBHelper.update('transactions',
          { status: 'completed', updated_at: new Date() },
          { transaction_id: transactionId }
        );

        // จัดการ subscription ผ่าน SubscriptionController
        const hasActiveSubscription = await SubscriptionController.hasActiveSubscription(userData.id);
        if (!hasActiveSubscription) {
          // สร้าง subscription ใหม่
          await SubscriptionController.createSubscription(
            userData.id,
            transactionData.package_id,
            {
              name: transactionData.package_name,
              duration: transactionData.package_duration
            }
          );

        } else {
          // ต่ออายุ subscription ที่มีอยู่
          await SubscriptionController.extendSubscription(
            userData.id,
            parseInt(transactionData.package_duration)
          );
        }

        // อัพเดท session ด้วยข้อมูล subscription ใหม่
        const updatedSubscription = await SubscriptionController.getActiveSubscription(userData.id, false);
        req.session.user.subscriptionData = updatedSubscription;

        res.json({
          success: true,
          status: 'completed',
          message: verifyResult.message,
          transaction: {
            ...transactionData,
            status: 'completed'
          },
          verification: {
            dateValid: verifyResult.dateValid,
            amountValid: verifyResult.amountValid,
            nameMatches: verifyResult.nameMatches,
            phoneMatches: verifyResult.phoneMatches,
            allVerified: verifyResult.allVerified
          }
        });
      } else {
        // ถ้าข้อมูลไม่ตรงกัน
        res.json({
          success: false,
          status: transactionData.status,
          message: verifyResult.message,
          transaction: transactionData,
          verification: {
            dateValid: verifyResult.dateValid,
            amountValid: verifyResult.amountValid,
            nameMatches: verifyResult.nameMatches,
            phoneMatches: verifyResult.phoneMatches,
            allVerified: verifyResult.allVerified
          }
        });
      }

    } catch (error) {
      console.error("Check order status error:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to check order status'
      });
    }
  }

  static async cancelOrder(req, res) {
    try {
      const { transactionId } = req.body;
      const userData = req.session.user;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
      }

      // ตรวจสอบว่า transaction มีอยู่และเป็นของ user นี้
      const transaction = await DBHelper.select('transactions', {
        transaction_id: transactionId,
        user_id: userData.id
      });

      if (!transaction || transaction.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      const transactionData = transaction[0];

      // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
      if (transactionData.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel completed transaction'
        });
      }

      if (transactionData.status === 'canceled') {
        return res.status(400).json({
          success: false,
          error: 'Transaction already canceled'
        });
      }

      // อัพเดทสถานะเป็น canceled
      await DBHelper.update('transactions',
        {
          status: 'canceled',
          updated_at: new Date()
        },
        { transaction_id: transactionId }
      );

      res.json({
        success: true,
        message: 'Order canceled successfully',
        transaction: {
          ...transactionData,
          status: 'canceled'
        }
      });

    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel order'
      });
    }
  }

  static async showOrderSuccessPage(req, res) {
    try {
      const userData = req.session.user;

      return res.render('user/order-success', {
        title: 'ออร์เดอร์สำเร็จ',
        userData: userData,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        }
      });
    } catch (error) {
      console.error("Order canceled page error:", error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load order canceled page'
      });
    }
  }

  static async showOrderCanceledPage(req, res) {
    try {
      const userData = req.session.user;

      res.render('user/order-canceled', {
        title: 'ยกเลิกออร์เดอร์สำเร็จ',
        userData: userData,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        }
      });
    } catch (error) {
      console.error("Order canceled page error:", error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load order canceled page'
      });
    }
  }
}

module.exports = PaymentController;
