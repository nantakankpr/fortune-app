const { DBHelper } = require('../services/ormService');

class UserController {
  async findByUserId(userId) {
    try {
      const rows = await DBHelper.select('users', { line_user_id: userId });
      return rows;
    } catch (err) {
      console.error('Query failed:', err.message);
    }
  }

  async createUser(userId, name, full_name, phone, birth_date, picture) {
    try {
      const users = await this.findByUserId(userId);
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
    }
  }

}

module.exports = new UserController();