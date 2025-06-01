/**
 * Middleware สำหรับเช็ค session และ role (member, admin)
 * @param {string|string[]} roles - role ที่อนุญาต เช่น 'member', ['admin', 'member']
 */
function auth(roles = []) {
    return (req, res, next) => {
      // เช็ค session และ user object
      if (!req.session || !req.session.user) {
        return res.status(401).json({ loggedIn: false, error: 'Unauthorized' });
      }
  
      // ถ้าไม่ระบุ role จะอนุญาตให้ผ่านได้หมด
      if (roles.length === 0) return next();
  
      // รองรับทั้ง string และ array
      const allowRoles = Array.isArray(roles) ? roles : [roles];
      const userRole = req.session.user.role; // ต้องให้ user มี field role
  
      if (!userRole || !allowRoles.includes(userRole)) {
        return res.status(403).json({ loggedIn: true, error: 'Forbidden: No permission' });
      }
      next();
    };
  }
  
  module.exports = auth;
  