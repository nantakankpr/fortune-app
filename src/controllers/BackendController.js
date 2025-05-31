const { DBHelper } = require('../services/ormService');
const bcrypt = require('bcrypt');

class BackendController {

  async login(username, password) {
    try {
      const user = await DBHelper.select('users', { username : username });
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

  async addUser(username, password, email) {
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

  async getStatistics() {

  }

  async getTransactions() {
    try {
      const rows = await DBHelper.select('transactions', {});
      return rows;
    } catch (err) {
      console.error('Query failed:', err.message);
      throw err;
    }
  }

  async updateTransaction(transactionId, status) {
    try {
      const result = await DBHelper.update('transactions', { status: status }, { id: transactionId });
      return result;
    } catch (err) {
      console.error('Update failed:', err.message);
      throw err;
    }
  }

  async updatePaymentService(paymentServiceId, data) {
    try {
      const result = await DBHelper.update('payment_services', data, { id: paymentServiceId });
      return result;
    } catch (err) {
      console.error('Update failed:', err.message);
      throw err;
    }
  }

}

module.exports = new BackendController();