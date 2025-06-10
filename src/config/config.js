module.exports = {
  // Server config
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database config
  DB_HOST: process.env.DB_HOST || '45.136.254.39',
  DB_USER: process.env.DB_USER || 'justindev',
  DB_PASSWORD: process.env.DB_PASSWORD || '@aunaun1234',
  DB_NAME: process.env.DB_NAME || 'line-oa-db',
  
  // LINE config
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'QYyeVCYDbJSL71e6OTPEkujgBkZBbcD7YQj+nYqbmeayNhnTfXszbcywnUHJVPlQxfVZjSGAfezvznjwqJbD53XoUUXk8vV4ZuSfrDrXvUZXXjVyvPrCH3YHOTkL/JbrvK850rl2O3mrv+98GyYK>',
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '745cba016f9b4f44c51ab9867343d475',
  LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID || '2007423411',
  
  // Session config
  SESSION_SECRET: process.env.SESSION_SECRET || 'fortune_app_key',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
  
  // LIFF config : frontend
  LIFF_ID: process.env.LIFF_ID || "2007423411-wVYbLZ63",

  // EasySlip config
  EASYSLIP_API_KEY: process.env.EASYSLIP_API_KEY || '03a2b257-cde1-46c0-b669-aeed4fb32049'
};