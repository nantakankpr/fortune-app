const DBHelper = require('../services/ormService');
const bcrypt = require('bcrypt');

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
      const rows = await DBHelper.select('transactions', {});
      return rows;
    } catch (err) {
      console.log('Get transactions failed:', err.message);
      throw err;
    }
  }

  static async updateTransaction(transactionId, status) {
    try {
      const result = await DBHelper.update('transactions', { status: status }, { id: transactionId });
      return result;
    } catch (err) {
      console.log('Update transaction failed:', err.message);
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

      if (req.device && req.device.type === 'phone') {
        res.render('admin/transactionsMobile', {
          title: 'Manage Transactions',
          transactions: transactions,
          admin: req.session.userData
        });
      } else {
        res.render('admin/transactions', {
          title: 'Manage Transactions',
          transactions: transactions,
          admin: req.session.userData
        });
      }
    } catch (error) {
      console.log('Show transactions page error:', error.message);
      res.status(500).render('error', {
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลธุรกรรมได้'
      });
    }
  }

  static async handleUpdateTransaction(req, res) {
    try {
      const { transactionId, status } = req.body;
      await BackendController.updateTransaction(transactionId, status);
      res.json({ 
        success: true, 
        message: 'อัปเดตธุรกรรมสำเร็จ' 
      });
    } catch (error) {
      console.log('Handle update transaction error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'ไม่สามารถอัปเดตธุรกรรมได้ กรุณาลองใหม่อีกครั้ง' 
      });
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