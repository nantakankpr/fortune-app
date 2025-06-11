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
      let transactions = row['row'] ;
      return res.render('admin/transactionTable', { transactions }, (err, html) => {
        if (err) {
          console.error('render error:', err);
          return res.status(500).send('Rendering failed');
        }
        res.send(html);
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
    res.render('admin/login', {
      title: 'Admin Login',
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  }

  static async handleLogin(req, res) {
    try {
      const { username, password } = req.body;
      const admin = await BackendController.login(username, password);
      req.session.userData = {
        username: admin.username,
        role: 'admin'
      }
      return res.status(200).json({ 
        success: true, 
        message: 'เข้าสู่ระบบสำเร็จ', 
        redirect: '/admin/transactions' 
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
      if (!actions || !actions.transactionId || !actions.status || !actions.userId || !actions.packageId ) {
        return res.status(400).json({ success: false, error: 'Invalid request data' });
      }
      const { transactionId, status, userId, packageId} = actions;
      const packageData =  await DBHelper.select('packages', { id: packageId });
      if(packageData.length === 0) {
        return res.status(404).json({ success: false, error: 'Package not found' });
      }
      if(status == 'completed') {
        await SubscriptionController.createSubscription(userId, packageId, packageData[0]);
      }
      await BackendController.updateTransaction(transactionId, status);
      res.json({ success: true, message: 'Transaction updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleLogout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.log('Session destroy error:', err.message);
          return res.status(500).json({ 
            success: false, 
            error: 'ไม่สามารถออกจากระบบได้' 
          });
        }
        res.redirect('/admin/login');
      });
    } catch (error) {
      console.log('Handle logout error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'ไม่สามารถออกจากระบบได้' 
      });
    }
  }
}

module.exports = BackendController;