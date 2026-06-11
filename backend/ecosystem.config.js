module.exports = {
  apps: [
    {
      name: 'mindclash-api',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: process.env.NODE_ENV !== 'production',
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'data', '*.db', '*.db-wal', '*.db-shm'],
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 4001,
        ENABLE_ONCHAIN_SIGNING: 'false',
      },
    },
  ],
};
