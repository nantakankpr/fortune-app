const express = require('express');
const mdw = require('../middlewares');
const auth = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/init', mdw.csrfProtection, (req, res) => {
    return res.render('user/init', { title: 'Fortune application', csrfToken: req.csrfToken() });
});

router.get('/register', mdw.csrfProtection, (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('order/payment');
    }
    return res.render('user/register', { title: 'Fortune application', csrfToken: req.csrfToken() });
});

router.get('/download-qr/:id', (req, res) => {
  const base64Image = req.session.qrcode; // หรือโหลดจาก DB
  if (!base64Image) return res.status(404).send('QR not found');

  const data = base64Image.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(data, 'base64');

  res.setHeader('Content-Type', 'image/png');
  res.send(buffer); // ❌ ไม่ใส่ Content-Disposition → ให้ JS ควบคุมชื่อไฟล์แทน
});




module.exports = router;