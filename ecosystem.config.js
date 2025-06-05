module.exports = {
  apps: [
    {
      name: 'books-api',
      script: 'dist/main.js',
      instances: '2', // Use two cores
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',
      
      // Advanced features
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Health monitoring
      max_restarts: 10,
      min_uptime: '10s',
      
      // Auto restart on file changes (disable in production)
      autorestart: false,
      
      // Graceful shutdown
      kill_timeout: 1600,
    }
  ],

}; 