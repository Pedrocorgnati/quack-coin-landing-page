// ecosystem.config.js — PM2 process manager configuration for QuackCoin
//
// NOTE: instances must remain 1 for SSE in-memory connections (ADR-0006).
//       Do NOT change exec_mode to 'cluster' or increase instances > 1.
//       The SseManager singleton holds active WebSocket-like connections in memory;
//       multiple instances would result in clients missing events from other instances.
//
// Usage:
//   pm2 start ecosystem.config.js          # start all apps
//   pm2 stop all                            # stop all apps
//   pm2 restart quackcoin-web               # restart web only
//   pm2 logs quackcoin-cron                 # tail cron logs
//   pm2 monit                               # live monitoring

"use strict";

module.exports = {
  apps: [
    {
      // ── Next.js web server ───────────────────────────────────────────
      name: "quackcoin-web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,             // MUST stay at 1 — see ADR-0006 (SSE in-memory constraint)
      exec_mode: "fork",        // NOT cluster — SSE requires single process
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/quackcoin/web-error.log",
      out_file: "/var/log/quackcoin/web-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      time: true,               // timestamp all log lines
    },

    {
      // ── Cron scheduler (standalone process) ─────────────────────────
      name: "quackcoin-cron",
      script: "node_modules/.bin/tsx",
      args: "cron/scheduler.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      restart_delay: 10000,    // wait 10s before restarting on crash
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/quackcoin/cron-error.log",
      out_file: "/var/log/quackcoin/cron-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      time: true,
    },
  ],
};
