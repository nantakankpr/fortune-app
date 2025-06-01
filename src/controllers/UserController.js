const { DBHelper } = require('../services/ormService');

class UserController {
  static async findByUserId(userId) {
    try {
      const rows = await DBHelper.select('users', { line_user_id: userId });
      return rows;
    } catch (err) {
      console.error('Query failed:', err.message);
      throw err;
    }
  }

  static async createUser(userId, name, full_name, phone, birth_date, picture) {
    try {
      const users = await UserController.findByUserId(userId);
      if (users && users.length > 0) {
        throw new Error('User already exists');
      }
      const result = await DBHelper.insert('users', {
        line_user_id: userId,
        line_name: name,
        full_name: full_name,
        phone: phone,
        birth_date: birth_date,
        picture: picture
      });
      return result;
    } catch (err) {
      console.error('Insert failed:', err.message);
      throw err;
    }
  }

  static async updateUser(userId, data) {
    try {
      const result = await DBHelper.update('users', data, { line_user_id: userId });
      return result;
    } catch (err) {
      console.error('Update failed:', err.message);
      throw err;
    }
  }
}

module.exports = UserController;