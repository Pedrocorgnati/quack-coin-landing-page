// lib/prisma.ts — PrismaClient singleton with MariaDB/MySQL adapter
// Prisma 7 requires a driver adapter. PrismaMariaDb works with MySQL.

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Allow the app to boot without a DB in local dev (e.g. marketing pages).
    // Any attempt to use Prisma will throw a clear error.
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            "PrismaClient is not configured: DATABASE_URL environment variable is not set",
          );
        },
      },
    ) as PrismaClient;
  }
  const adapter = new PrismaMariaDb(databaseUrl);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
