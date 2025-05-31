module.exports = {
  apps: [
    {
      name: 'line-oa-api-test',
      script: './src/app.js',
      instances: 1,
      env: {
        NODE_ENV: 'development',
        PORT: 5000, 
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      }
    }
  ]
}
