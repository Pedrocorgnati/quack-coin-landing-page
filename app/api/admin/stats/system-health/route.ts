// app/api/admin/stats/system-health/route.ts
// Health check for DB, Redis, and SSE active connections.
// Called every 30s from the admin header.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { SseManager } from "@/lib/sse/sseManager";

type CheckStatus = "ok" | "error";
type OverallStatus = "healthy" | "degraded" | "down";

interface HealthChecks {
  db: { status: CheckStatus; latencyMs?: number; error?: string };
  redis: { status: CheckStatus; latencyMs?: number; error?: string };
  sse: { status: CheckStatus; activeConnections: number };
}

export async function GET() {
  await requireAdmin();

  const checks: HealthChecks = {
    db: { status: "error" },
    redis: { status: "error" },
    sse: { status: "ok", activeConnections: 0 },
  };

  // DB check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.db = { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks.redis = { status: "ok", latencyMs: Date.now() - redisStart };
  } catch (err) {
    checks.redis = { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }

  // SSE connections
  checks.sse = { status: "ok", activeConnections: SseManager.size() };

  // Determine overall status
  const hasError = checks.db.status === "error" || checks.redis.status === "error";
  const bothDown = checks.db.status === "error" && checks.redis.status === "error";

  const status: OverallStatus = bothDown ? "down" : hasError ? "degraded" : "healthy";

  return NextResponse.json({ status, checks });
}
