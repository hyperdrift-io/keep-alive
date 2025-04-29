module.exports = {
  apps: [{
    name: "keepalive",
    // Run only the Elysia API server in production using Node.js (no Bun dev/static server)
    script: "node dist/index.js",
    env: {
      KEEPALIVE_PORT: 3001,
      NODE_ENV: "production",
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    out_file: "logs/pm2.log",
    error_file: "logs/pm2-error.log",
    combine_logs: true,
    max_memory_restart: "200M",
    watch: false,
    autorestart: true
  }]
}
