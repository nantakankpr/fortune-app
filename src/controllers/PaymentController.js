const { provider, EasySlipService } = require('../services/payment');
const DBHelper = require('../services/ormService');
const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr');
const UserController = require('../controllers/UserController');
const TransactionModel = require('../models/TransactionModel');
const config = require('../config/config');
const SubscriptionController = require('./SubscriptionController');
const { listenerCount } = require('form-data');

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
      //csrf
      res.render('user/payment', {
        title: 'Payment',
        userData: userData,
        paymentData: paymentData,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        },
        csrfToken: req.csrfToken()
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
      const selectedPackage = req.body.selectedPackage;
      // ตรวจสอบข้อมูล package
      if (!selectedPackage || !selectedPackage.name || !selectedPackage.duration || !selectedPackage.price) {
        return res.status(400).json({
          success: false,
          error: 'Invalid package data'
        });
      }

      let transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      let created_at = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const transactionData = {
        transaction_id: transactionId,
        user_id: userData.id,
        package_id: selectedPackage.id || 1, // ใส่ default ID
        package_name: selectedPackage.name,
        package_duration: parseInt(selectedPackage.duration), // แปลงเป็น int
        amount: parseFloat(selectedPackage.price), // แปลงเป็น float
        recipient_name: config.RECIPIENT_NAME,
        recipient_mobile: config.PROMPTPAY_ID,
        status: 'pending',
        transaction_type: 'payment', // กำหนดชัดเจน
        created_at: new Date(),
        updated_at: new Date()
      };

      await TransactionModel.createTransaction(transactionData);

      const paymentData = await PaymentController.createOrderPayment(userData);

      res.json({
        success: true,
        paymentData: paymentData
      });
    } catch (error) {
      console.error("❌ Create payment error:", error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment'
      });
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

    let paymentData = verificationResult.data;
    let accountInfo = paymentData.receiver.account;

    // ตรวจสอบวันที่ - เปรียบเทียบแบบเข้มงวดขึ้น
    const paymentDate = new Date(paymentData.date);
    const transactionDate = new Date(transactionData.created_at);
    const dateValid = paymentDate >= transactionDate &&
      paymentDate <= new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000); // ภายใน 24 ชั่วโมง

    // ตรวจสอบจำนวนเงิน - เปรียบเทียบแบบ exact
    const paymentAmount = parseFloat(paymentData.amount.amount);
    const transactionAmount = parseFloat(transactionData.amount);
    const amountValid = Math.abs(paymentAmount - transactionAmount) < 0.01; // tolerance 1 สตางค์

    // ตรวจสอบชื่อบัญชี - ปรับปรุงการเปรียบเทียบ
    let nameMatches = false;
    if (accountInfo && accountInfo.name && transactionData.recipient_name) {
      const slipNameParts = accountInfo.name.th.toLowerCase().trim()
        .replace(/[^\u0E00-\u0E7Fa-zA-Z\s]/g, '') // เอาเฉพาะตัวหนังสือไทย อังกฤษ และช่องว่าง
        .split(/\s+/);
      const recipientNameParts = transactionData.recipient_name.toLowerCase().trim()
        .replace(/[^\u0E00-\u0E7Fa-zA-Z\s]/g, '')
        .split(/\s+/);

      // ตรวจสอบว่ามีคำที่ตรงกันอย่างน้อย 1 คำ และยาวกว่า 1 ตัวอักษร
      nameMatches = slipNameParts.some(slipPart =>
        recipientNameParts.some(recipientPart =>
          slipPart.length > 1 && recipientPart.length > 1 &&
          (slipPart.includes(recipientPart) || recipientPart.includes(slipPart))
        )
      );
    }

    // ตรวจสอบเบอร์โทรศัพท์ - ปรับปรุงการเปรียบเทียบ
    let phoneMatches = true; // default true ถ้าไม่มีข้อมูลเบอร์
    if (accountInfo && accountInfo.proxy && transactionData.recipient_mobile) {
      const slipPhone = accountInfo.proxy.account.replace(/\D/g, '');
      const recipientPhone = transactionData.recipient_mobile.replace(/\D/g, '');

      if (slipPhone.length >= 4 && recipientPhone.length >= 4) {
        const slipLast4 = slipPhone.slice(-4);
        const recipientLast4 = recipientPhone.slice(-4);
        phoneMatches = slipLast4 === recipientLast4;
      }
    }

    // รวมผลการตรวจสอบทั้งหมด
    const allVerified = dateValid && amountValid && nameMatches && phoneMatches;

    let errorMessage = '';
    if (!allVerified) {
      const errors = [];
      if (!dateValid) errors.push('วันที่ไม่ถูกต้อง');
      if (!amountValid) errors.push('จำนวนเงินไม่ถูกต้อง');
      if (!nameMatches) errors.push('ชื่อบัญชีไม่ตรงกัน');
      if (!phoneMatches) errors.push('เบอร์โทรศัพท์ไม่ตรงกัน');
      errorMessage = 'ข้อมูลในสลิปไม่ตรงกับรายการโอน: ' + errors.join(', ');
    }

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
          error: 'Transaction ID is required'
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

        // ดึงข้อมูล package
        let packageData = {};
        if (transactionData.package_id) {
          try {
            const packageResult = await DBHelper.select('packages', {
              id: transactionData.package_id,
              is_active: 1
            });

            if (packageResult && packageResult.length > 0) {
              packageData = packageResult[0];
            } else {
              // ใช้ข้อมูลจาก transaction หากไม่พบใน packages table
              packageData = {
                id: transactionData.package_id,
                name: transactionData.package_name,
                duration: transactionData.package_duration,
                price: transactionData.amount
              };
            }
          } catch (packageError) {
            console.error('❌ Error fetching package from database:', packageError);
            // ใช้ข้อมูลจาก transaction เป็น fallback
            packageData = {
              id: transactionData.package_id,
              name: transactionData.package_name,
              duration: transactionData.package_duration,
              price: transactionData.amount
            };
          }
        }

        // จัดการตาม transaction type
        let redirectUrl;
        let successMessage;

        if (transactionData.transaction_type === 'renewal') {
          // กรณีต่ออายุ - อัพเดท subscription ที่มีอยู่
          await PaymentController.handleRenewalCompletion(userData.id, packageData);
          redirectUrl = '/order/renew-success';
          successMessage = 'การต่ออายุเสร็จสมบูรณ์';
        } else {
          // กรณีสมัครใหม่ - สร้าง subscription ใหม่
          await SubscriptionController.createSubscription(
            userData.id,
            transactionData.package_id,
            packageData
          );
          redirectUrl = '/order/succeeded';
          successMessage = 'การสมัครเสร็จสมบูรณ์';
        }

        res.json({
          success: true,
          status: 'completed',
          message: successMessage,
          redirectUrl: redirectUrl,
          transactionType: transactionData.transaction_type,
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
        
        // ส่งข้อมูล verification กลับไป
        res.json({
          success: false,
          status: transactionData.status,
          message: verifyResult.message || 'ไม่สามารถยืนยันการชำระเงินได้',
          transactionType: transactionData.transaction_type,
          transaction: transactionData,
          verification: {
            dateValid: verifyResult.dateValid || false,
            amountValid: verifyResult.amountValid || false,
            nameMatches: verifyResult.nameMatches || false,
            phoneMatches: verifyResult.phoneMatches || false,
            allVerified: verifyResult.allVerified || false
          }
        });
      }

    } catch (error) {
      console.error("❌ Check order status error:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to check order status',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
      });
    }
  }

  /**
   * จัดการการต่ออายุที่เสร็จสมบูรณ์
   */
  static async handleRenewalCompletion(userId, packageData) {
    try {
      // ดึง subscription ที่หมดอายุ
      const expiredSubscription = await SubscriptionController.getExpiredSubscription(userId);
      
      if (expiredSubscription) {
        // คำนวณวันหมดอายุใหม่
        const today = new Date();
        const newEndDate = new Date(today);
        newEndDate.setDate(newEndDate.getDate() + parseInt(packageData.duration));
        
        // อัพเดท subscription ที่หมดอายุให้กลับมา active
        await DBHelper.update('subscriptions', 
          {
            is_active: 1,
            start_date: new Date(),
            end_date: newEndDate,
            package_name: packageData.name,
            package_duration: parseInt(packageData.duration),
            package_price: parseFloat(packageData.price),
            updated_at: new Date()
          },
          { id: expiredSubscription.id }
        );
        
      } else {
        // ถ้าไม่พบ expired subscription ให้สร้างใหม่
        await SubscriptionController.createSubscription(userId, packageData.id, packageData);
      }
    } catch (error) {
      console.error('❌ Error handling renewal completion:', error);
      throw error;
    }
  }


  static async showOrderSuccessPage(req, res) {
    try {
      const userData = req.session.user;
      // ดึงข้อมูล subscription ล่าสุด (middleware ตรวจสอบแล้วว่ามี active subscription)
      const subscriptionData = await SubscriptionController.getActiveSubscription(userData.id);

      if (!subscriptionData) {
        // ถ้าไม่มี subscription redirect ไป payment
        return res.redirect('/order/payment');
      }

      // คำนวณวันที่เหลือ
      const endDate = new Date(subscriptionData.end_date);
      const today = new Date();
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      return res.render('user/order-success', {
        title: 'สมัครสำเร็จ',
        userData: {
          ...userData,
          subscriptionData: subscriptionData
        },
        daysLeft: daysLeft,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        }
      });
    } catch (error) {
      console.error("Order success page error:", error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load order success page'
      });
    }
  }

  static async showRenewPage(req, res) {
    try {
      const userData = req.session.user;

      if (!userData || !userData.id) {
        return res.redirect('/init');
      }

      // ตรวจสอบว่าไม่มี active subscription อยู่
      const activeSubscription = await SubscriptionController.getActiveSubscription(userData.id);
      if (activeSubscription) {
        // ถ้ามี active subscription แล้ว redirect ไปหน้า success
        return res.redirect('/order/succeeded');
      }

      // ดึงข้อมูล subscription ที่หมดอายุ
      const expiredSubscription = await SubscriptionController.getExpiredSubscription(userData.id);
      
      if (!expiredSubscription) {
        // ถ้าไม่มี subscription ที่หมดอายุ redirect ไป payment
        return res.redirect('/order/payment');
      }

      // ดึงข้อมูล package สำหรับการต่ออายุ
      const packageData = await DBHelper.select('packages', { id: 1, is_active: 1 });
      if (!packageData || packageData.length === 0) {
        throw new Error('Package is inactive!');
      }

      // ดึงข้อมูลผู้รับเงิน
      const recipient = await DBHelper.select('promptpay_recipients', { id: 1 });
      if (!recipient || recipient.length === 0) {
        throw new Error('Recipient account is inactive!');
      }

      // ตรวจสอบว่ามี pending transaction สำหรับ renewal อยู่แล้วหรือไม่
      const existingTransaction = await DBHelper.select('transactions', { 
        user_id: userData.id, 
        status: 'pending',
        transaction_type: 'renewal'
      });

      let transactionId;
      let created_at;

      if (existingTransaction && existingTransaction.length > 0) {
        // ใช้ transaction ที่มีอยู่แล้ว
        transactionId = existingTransaction[0].transaction_id;
        created_at = new Date(existingTransaction[0].created_at).toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        // สร้าง transaction ใหม่
        transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        created_at = new Date().toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        const transactionData = {
          transaction_id: transactionId,
          user_id: userData.id,
          package_id: packageData[0].id,
          package_name: packageData[0].name,
          package_duration: parseInt(packageData[0].duration),
          amount: parseFloat(packageData[0].price),
          recipient_name: recipient[0].full_name,
          recipient_mobile: recipient[0].phone_number,
          status: 'pending',
          transaction_type: 'renewal',
          created_at: new Date(),
          updated_at: new Date()
        };

        await TransactionModel.createTransaction(transactionData);
      }
      
      // สร้าง PromptPay QR Code
      const amount = parseFloat(packageData[0].price);
      const payload = generatePayload(recipient[0].phone_number, { amount });
      const qrImageUrl = await QRCode.toDataURL(payload);

      // คำนวณวันที่
      const today = new Date();
      const expiredDate = new Date(expiredSubscription.end_date);
      const daysExpired = Math.ceil((today - expiredDate) / (1000 * 60 * 60 * 24));
      
      // คำนวณวันหมดอายุใหม่หลังต่ออายุ
      const newEndDate = new Date(today);
      newEndDate.setDate(newEndDate.getDate() + parseInt(packageData[0].duration));

      // สร้างข้อมูลสำหรับการต่ออายุ
      const renewalData = {
        transactionId: transactionId,
        amount: amount,
        qrImageUrl: qrImageUrl,
        recipient: {
          mobileNumber: recipient[0].phone_number,
          fullName: recipient[0].full_name,
        },
        package: {
          id: packageData[0].id,
          name: packageData[0].name,
          duration: packageData[0].duration,
          price: packageData[0].price
        },
        expiredSubscription: {
          ...expiredSubscription,
          package_display_name: expiredSubscription.package_name || packageData[0].name
        },
        daysExpired: daysExpired,
        newEndDate: newEndDate.toLocaleDateString('th-TH'),
        createdAt: created_at
      };

      return res.render('user/renew', {
        title: 'ต่ออายุแพ็คเกจ',
        userData: userData,
        renewalData: renewalData,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        },
        csrfToken: req.csrfToken()
      });
    } catch (error) {
      console.error("Renew page error:", error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load renew page'
      });
    }
  }

  static async renewSubscription(req, res) {
    try {
      const userData = req.session.user;
      const selectedPackage = req.body.selectedPackage;

      // ตรวจสอบข้อมูล package
      if (!selectedPackage || !selectedPackage.name || !selectedPackage.duration || !selectedPackage.price) {
        return res.status(400).json({
          success: false,
          error: 'Invalid package data'
        });
      }

      // สร้าง transaction ใหม่
      let transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      let created_at = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const transactionData = {
        transaction_id: transactionId,
        user_id: userData.id,
        package_id: selectedPackage.id || 1, // ใส่ default ID
        package_name: selectedPackage.name,
        package_duration: parseInt(selectedPackage.duration), // แปลงเป็น int
        amount: parseFloat(selectedPackage.price), // แปลงเป็น float
        recipient_name: config.RECIPIENT_NAME,
        recipient_mobile: config.PROMPTPAY_ID,
        status: 'pending',
        transaction_type: 'renewal', // กำหนดชัดเจน
        created_at: new Date(),
        updated_at: new Date()
      };

      await TransactionModel.createTransaction(transactionData);
      const paymentData = await PaymentController.createOrderPayment(userData);

      res.json({
        success: true,
        paymentData: paymentData
      });
    } catch (error) {
      console.error("❌ Renew subscription error:", error);
      return res.status(500).json({
        success: false,
        error: 'Failed to renew subscription'
      });
    }
  }

  /**
   * แสดงหน้าต่ออายุสำเร็จ
   */
  static async showRenewSuccessPage(req, res) {
    try {
      const userData = req.session.user;

      if (!userData || !userData.id) {
        return res.redirect('/init');
      }

      // ดึงข้อมูล subscription ที่ active
      const subscriptionData = await SubscriptionController.getActiveSubscription(userData.id);

      if (!subscriptionData) {
        // ถ้าไม่มี subscription redirect ไป payment
        return res.redirect('/order/payment');
      }

      // คำนวณวันที่เหลือ
      const endDate = new Date(subscriptionData.end_date);
      const today = new Date();
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      return res.render('user/renew-success', {
        title: 'ต่ออายุสำเร็จ',
        userData: {
          ...userData,
          subscriptionData: subscriptionData
        },
        daysLeft: daysLeft,
        config: {
          liffId: config.LIFF_ID,
          nodeEnv: config.NODE_ENV,
        }
      });
    } catch (error) {
      console.error("❌ Renew success page error:", error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load renew success page'
      });
    }
  }
}

module.exports = PaymentController;
