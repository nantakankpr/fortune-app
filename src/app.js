const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // ← อย่าลืม require
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const device = require('express-device');

const { dbOptions } = require('./services/dbService');
const webhookRoute = require('./routes/webhook');
const routes = require('./routes');

const app = express();
const PORT = process.env.AUN_PORT || 3000;

// 🔐 Security
app.use(helmet({ contentSecurityPolicy: false }));

// 🔧 Compression
app.use(compression());

// 📱 Device detector
app.use(device.capture());

// 🍪 Cookie parser (ควรอยู่ก่อน session เผื่อใช้ cookie ใน custom logic)
app.use(cookieParser());

// 🛠️ Session (ควรอยู่ก่อน body-parser และ router)
const sessionStore = new MySQLStore({
  ...dbOptions,                   // ✅ กระจายค่าจาก dbOptions
  clearExpired: true,            // ✅ เคลียร์ session ที่หมดอายุ
  checkExpirationInterval: 900000 // ✅ ตรวจทุก 15 นาที (หน่วย ms)
});


app.use(session({
  key: 'session_id',
  secret: 'fortune_app_key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400000,
  }
}));

// 🌐 View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', false);

// 📸 Static files
app.use(express.static(path.join(__dirname, '../public')));

// === 🚨 LINE Webhook: ต้องมาก่อน body-parser เพราะ LINE อาจส่ง raw body
app.use('/webhook', webhookRoute);

// 🧠 Body Parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 🌍 Routes
app.use('/', routes);

// ❌ CSRF/ทั่วไป error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).send('Access denied.');
  } else {
    next(err);
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
