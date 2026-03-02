// app/api/health/route.ts
// GET /api/health — public health check endpoint (no auth required).
// Returns DB + Redis connectivity status.
// 200 if all critical dependencies are healthy, 503 otherwise.
// Used by PM2 and Nginx upstream health checks.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  db: "ok" | "error";
  redis: "ok" | "error";
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [dbStatus, redisStatus] = await Promise.all([
    checkDb(),
    checkRedis(),
  ]);

  const allOk = dbStatus === "ok" && redisStatus === "ok";

  const body: HealthResponse = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    db: dbStatus,
    redis: redisStatus,
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}

async function checkDb(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<"ok" | "error"> {
  try {
    await redis.ping();
    return "ok";
  } catch {
    return "error";
  }
}
