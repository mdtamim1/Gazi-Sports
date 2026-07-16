module.exports = {
  apps: [
    {
      name: 'gazi-sports-backend',
      script: './backend/dist/server.js',
      instances: 'max',            // Run in cluster mode utilizing all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      watch: false,                 // Don't watch in production to avoid infinite reload loops
      max_memory_restart: '1G',     // Auto-restart if process memory usage exceeds 1GB
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      merge_logs: true
    }
  ]
};
