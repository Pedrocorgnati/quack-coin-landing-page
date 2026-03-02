// lib/logger.ts
// Structured logging singleton using pino.
// - Production: JSON output (machine-readable, picked up by PM2 + log rotation)
// - Development: pretty-print via pino-pretty

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    // In production, omit pino-pretty options — JSON only
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    }),
  },
);

export default logger;
