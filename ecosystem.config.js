module.exports = {
  apps: [
    {
      name: 'fortune-app',
      script: './src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // เพิ่มจาก 512M เป็น 1G
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        instances: 1, // ยังคงใช้ 1 instance
        exec_mode: 'fork', // ยังคงใช้ fork
      }
    }
  ]
}
