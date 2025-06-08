module.exports = {
  apps: [
    {
      name: 'fortune-app',
      script: './src/app.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1.5G',
      time: true,
      env: {
        NODE_ENV: 'development',
        instances: 1,
        exec_mode: 'fork'
      },
      env_production: {
        NODE_ENV: 'production',
        instances: 1, // เปลี่ยนเป็น 'max' ถ้าจะ scale
        exec_mode: 'cluster'
      }
    }
  ]
};
