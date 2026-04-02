module.exports = {
  apps: [{
    name: 'crm-agent',
    script: 'src/index.js',
    interpreter: 'node',
    node_args: '--experimental-modules',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3200
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/pm2/crm-agent-error.log',
    out_file: '/var/log/pm2/crm-agent-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
