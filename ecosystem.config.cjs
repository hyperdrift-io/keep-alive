module.exports = {
  apps: [{
    name: "keepalive",
    script: "bun run index.ts",
    env: {
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
