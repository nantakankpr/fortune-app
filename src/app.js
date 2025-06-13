const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const device = require('express-device');
const fileUpload = require('express-fileupload');

const config = require('./config/config');
const { dbOptions } = require('./services/dbService');
const webhookRoute = require('./routes/webhook');
const routes = require('./routes');
const { CronScheduler } = require('./jobs'); // เพิ่ม cron scheduler
const DBHelper = require('./services/ormService'); // เพิ่ม import DBHelper

const app = express();
const PORT = config.PORT || 3000;

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
  secret: config.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: config.SESSION_MAX_AGE,
  }
}));

// Add file upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached",
  useTempFiles: false,
  tempFileDir: '/tmp/'
}));

// Body parser middleware (make sure this comes after fileUpload)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🌐 View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', false);

// 📸 Static files
app.use(express.static(path.join(__dirname, '../public')));

// === 🚨 LINE Webhook: ต้องมาก่อน body-parser เพราะ LINE อาจส่ง raw body
app.use('/webhook', webhookRoute);
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

// 📅 Initialize Cron Jobs
CronScheduler.initializeJobs();

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  
  // แสดงสถานะ cron jobs
  const jobsStatus = CronScheduler.getJobsStatus();
});

// 🛑 Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    // หยุด cron jobs
    console.log('📅 Stopping cron jobs...');
    CronScheduler.stopAllJobs();
    
    // ปิด database pool
    console.log('💾 Closing database connections...');
    await DBHelper.closePool();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    // หยุด cron jobs
    console.log('📅 Stopping cron jobs...');
    CronScheduler.stopAllJobs();
    
    // ปิด database pool
    console.log('💾 Closing database connections...');
    await DBHelper.closePool();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = app;
