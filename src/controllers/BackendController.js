const DBHelper = require('../services/ormService');
const bcrypt = require('bcrypt');
const TransactionModel = require('../models/TransactionModel');
const SubscriptionController = require('./SubscriptionController');


class BackendController {
  static async login(username, password) {
    try {
      let user = await DBHelper.select('admins', { username: username });
      if (!user || user.length === 0) {
        throw new Error('User not found');
      }
      user = user[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }

      return { success: true, username: user.username };
    } catch (err) {
      console.log('Login failed:', err.message);
      throw err;
    }
  }

  static async addUser(username, password, email) {
    try {
      const existingUser = await DBHelper.select('admins', { username: username });
      if (existingUser && existingUser.length > 0) {
        throw new Error('Username already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        username,
        password: hashedPassword,
        email,
        created_at: new Date(),
      };
      const result = await DBHelper.insert('admins', newUser);
      return result;
    } catch (err) {
      console.log('Add user failed:', err.message);
      throw err;
    }
  }

  static async handleAddUser(req, res) {
    try {
      const { username, password, email } = req.body;
      const result = await BackendController.addUser(username, password, email);
      return res.status(201).json({
        success: true,
        message: 'เพิ่มผู้ดูแลสำเร็จ',
        userId: result.insertId
      });
    } catch (error) {
      console.log('Handle add user error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถเพิ่มผู้ดูแลได้ กรุณาลองใหม่อีกครั้ง'
      });
    }
  }

  static async getTransactions() {
    try {
      const rows = await TransactionModel.getTransaction();
      return rows;
    } catch (err) {
      console.error('Query failed:', err.message);
      throw err;
    }
  }

  static async filteredTransactions(req, res) {
    const filters = req.body;
    try {
        if (!filters || typeof filters !== 'object' || Object.keys(filters).length === 0) {
            return res.status(400).json({ success: false, data: {}, message: "Empty filters" });
        }
        const row = await TransactionModel.getTransaction(filters);
        let transactions = row['row'];
        let totalRecords = row['total_record'];
        let totalPages = Math.ceil(totalRecords / filters.itemsPerPage);

        res.render('admin/transactionTable', { transactions }, (err, html) => {
            if (err) {
                console.error('render error:', err);
                return res.status(500).send('Rendering failed');
            }
            res.json({
                success: true,
                html: html,
                totalRecords: totalRecords,
                totalPages: totalPages,
                currentPage: filters.currentPage
            });
        });
    } catch (err) {
        console.error("Filter failed:", err);
        return res.status(500).send('Server error');
    }
  }

  static async updateTransaction(transactionId, status) {
    try {
      const result = await DBHelper.update('transactions', { status: status }, { transaction_id: transactionId });
      return result;
    } catch (err) {
      console.error('Update failed:', err.message);
      throw err;
    }
  }

  // ==================== ADMIN PAGE RENDERS ====================
  static showLoginPage(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    // ตรวจสอบว่า login แล้วหรือยัง
    if (req.session && req.session.userData && req.session.userData.role === 'admin') {
      console.log('User already logged in, redirecting to transactions');
      return res.redirect('/admin/transactions');
    }

    // ถ้ายังไม่ login ให้แสดงหน้า login
    res.render('admin/login', {
      title: 'Admin Login',
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  }

  static async handleLogin(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const { username, password } = req.body;
      const admin = await BackendController.login(username, password);

      // กำหนดข้อมูล session
      req.session.userData = {
        username: admin.username,
        role: 'admin',
        userType: 'admin' // เพิ่มเผื่อ middleware ตรวจสอบ
      };

      // บังคับ save session ก่อน response
      req.session.save((err) => {
        if (err) {
          console.log('Session save error:', err);
          return res.status(500).json({
            success: false,
            error: 'ไม่สามารถบันทึก session ได้'
          });
        }

        console.log('Login successful, session saved:', req.session.userData);
        return res.status(200).json({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          redirect: '/admin/transactions'
        });
      });

    } catch (error) {
      console.log('Handle login error:', error.message);
      return res.status(401).json({
        success: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }
  }

  static async showTransactionsPage(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const transactions = await BackendController.getTransactions();
      res.render('admin/transactions', {
        title: 'Manage Transactions',
        transactions: transactions['row'] || [],
        total_record: transactions['total_record'] || 0,
        csrfToken: req.csrfToken ? req.csrfToken() : null,
        admin: req.session.userData || null
      });
    } catch (error) {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load transactions'
      });
    }
  }

  static async handleUpdateTransaction(req, res) {
    try {
      const actions = req.body.actions;
      if (!actions || !actions.transactionId || !actions.status || !actions.userId || !actions.packageId) {
        return res.status(400).json({ success: false, error: 'Invalid request data' });
      }
      const { transactionId, status, userId, packageId } = actions;
      const packageData = await DBHelper.select('packages', { id: packageId });
      if (packageData.length === 0) {
        return res.status(404).json({ success: false, error: 'Package not found' });
      }

      await BackendController.updateTransaction(transactionId, status);
      await SubscriptionController.createSubscription(userId, packageId, packageData[0]);

      res.json({ success: true, message: 'Transaction updated successfully' });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ success: false, error: 'Update transaction error' });
    }
  }

  static async handleLogout(req, res) {
    try {
      req.session.destroy(err => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ success: false, error: 'Failed to logout' });
        }
        res.clearCookie('session_id'); // ลบ cookie ที่เกี่ยวข้องกับ session
        res.status(200).json({ success: true });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }
}

module.exports = BackendController;