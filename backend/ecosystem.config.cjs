module.exports = {
  apps: [
    {
      name: 'beatwap-api',
      script: 'index.js',
      cwd: '/var/www/api',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    }
  ]
};

