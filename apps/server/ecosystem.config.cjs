module.exports = {
  apps: [
    {
      name: 'ideahub-server',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Restart policy
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
