const DBHelper = require('../services/ormService');
const bcrypt = require('bcrypt');

class BackendController {
  static async login(username, password) {
    try {
      let user = await DBHelper.select('admins', { username: username });
      if (!user || user.length === 0) {
        throw new Error('User not found');
      }
      user = user[0]; // Assuming select returns an array of users, take the first one
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }

      return { success: true, username: user.username };
    } catch (err) {
      console.error('Login failed:', err.message);
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
      console.error('Registration failed:', err.message);
      throw err;
    }
  }

  // controller req,res handleAddUser
  static async handleAddUser(req, res) {
    try {
      const { username, password, email } = req.body;
      const result = await BackendController.addUser(username, password, email);
      return res.status(201).json({ success: true, message: 'User added successfully', userId: result.insertId });
    }
    catch (error) {
      console.error('Error adding user:', error.message);
      return res.status(500).json({ success: false, error: error.message });
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
      req.session.userData = {
        username: admin.username,
        role: 'admin' // กำหนด role เป็น admin
      }
      return res.status(200).json({ success: true, message: 'Login successful', redirect: '/admin/transactions' });
    } catch (error) {
      return res.status(401).json({ success: false, error: error.message });
    }
  }

  static async showTransactionsPage(req, res) {
    try {
      const transactions = await BackendController.getTransactions();

      if (req.device && req.device.type === 'phone') {
        res.render('admin/transactionsMobile', {
          title: 'Manage Transactions',
          transactions: transactions,
          admin: req.session.userData.username // ใช้ req.session.userData แทน req.session.admin
        });
      } else {
        res.render('admin/transactions', {
          title: 'Manage Transactions',
          transactions: transactions,
          admin: req.session.userData.username // ใช้ req.session.userData แทน req.session.admin
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