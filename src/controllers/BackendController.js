const { DBHelper } = require('../services/ormService');
const bcrypt = require('bcrypt');

class BackendController {
  static async login(username, password) {
    try {
      const user = await DBHelper.select('users', { username: username });
      if (!user) {
        throw new Error('User not found');
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }
      // Remove sensitive info before returning
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err) {
      console.error('Login failed:', err.message);
      throw err;
    }
  }

  static async addUser(username, password, email) {
    try {
      const existingUser = await DBHelper.select('users', { username });
      if (existingUser) {
        throw new Error('Username already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        username,
        password: hashedPassword,
        email,
        created_at: new Date(),
      };
      const result = await DBHelper.insert('users', newUser);
      return result;
    } catch (err) {
      console.error('Registration failed:', err.message);
      throw err;
    }
  }

  static async getTransactions() {
    try {
      const rows = await DBHelper.select('transactions', {});
      return rows;
    } catch (err) {
      console.error('Query failed:', err.message);
      throw err;
    }
  }

  static async updateTransaction(transactionId, status) {
    try {
      const result = await DBHelper.update('transactions', { status: status }, { id: transactionId });
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
      
      if (admin.role !== 'admin') {
        return res.status(403).render('admin/login', { 
          title: 'Admin Login',
          error: 'Access denied. Admin privileges required.',
          csrfToken: req.csrfToken()
        });
      }

      req.session.user = admin; // ใช้ req.session.user แทน req.session.admin
      res.redirect('/admin/transactions');
    } catch (error) {
      res.status(401).render('admin/login', { 
        title: 'Admin Login',
        error: error.message,
        csrfToken: req.csrfToken()
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
          admin: req.session.user // ใช้ req.session.user แทน req.session.admin
        });
      } else {
        res.render('admin/transactions', { 
          title: 'Manage Transactions',
          transactions: transactions,
          admin: req.session.user // ใช้ req.session.user แทน req.session.admin
        });
      }
    } catch (error) {
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Failed to load transactions'
      });
    }
  }

  static async handleUpdateTransaction(req, res) {
    try {
      const { transactionId, status } = req.body;
      await BackendController.updateTransaction(transactionId, status);
      res.json({ success: true, message: 'Transaction updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleLogout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/admin/login');
    });
  }
}

module.exports = BackendController;