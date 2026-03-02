// app/api/admin/site-config/route.ts
// GET  /api/admin/site-config  — list all SiteConfig entries { key, value, updatedAt }[]
// PATCH /api/admin/site-config — batch update with per-key Zod validation.
//   Body: { updates: { key: string; value: string }[] }
//   - Validates all values via SITE_CONFIG_SCHEMA before any DB write (all-or-nothing).
//   - Invalidates Redis per-key after update.
//   - Writes one audit log entry per changed key.
//   - Emits SSE event `config_updated` to all open admin tabs.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireRole";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { logAdminAction } from "@/lib/audit/audit-log";
import { SseManager } from "@/lib/sse/sseManager";

// ── Per-key validation schema ──────────────────────────────────────────────
// Keys not listed here accept any non-empty string value.

const SITE_CONFIG_SCHEMA: Record<string, z.ZodTypeAny> = {
  // QC earn rates (integer 0–10 000)
  "qc.earn.daily_login":      z.coerce.number().int().min(0).max(10_000),
  "qc.earn.referral":         z.coerce.number().int().min(0).max(10_000),
  "qc.earn.lesson_complete":  z.coerce.number().int().min(0).max(10_000),
  "qc.earn.course_complete":  z.coerce.number().int().min(0).max(10_000),
  "qc.earn.purchase":         z.coerce.number().int().min(0).max(10_000),
  "qc.earn.staking_deposit":  z.coerce.number().int().min(0).max(10_000),
  "qc.earn.raffle_entry":     z.coerce.number().int().min(0).max(10_000),

  // Membership USDC prices (non-negative decimal)
  "membership.price.SILVER":   z.coerce.number().min(0),
  "membership.price.GOLD":     z.coerce.number().min(0),
  "membership.price.PLATINUM": z.coerce.number().min(0),
  "membership.price.DIAMOND":  z.coerce.number().min(0),

  // Staking APY (0–200 %)
  "staking.apy.base":      z.coerce.number().min(0).max(200),
  "staking.apy.SILVER":    z.coerce.number().min(0).max(200),
  "staking.apy.GOLD":      z.coerce.number().min(0).max(200),
  "staking.apy.PLATINUM":  z.coerce.number().min(0).max(200),

  // Cashback rate (0–100 %)
  "cashback.rate": z.coerce.number().min(0).max(100),

  // QC expiry
  "qc.expiry.enabled": z.enum(["true", "false"]),
  "qc.expiry.days":    z.coerce.number().int().min(1).max(3650),
};

// ── Request schemas ────────────────────────────────────────────────────────

const UpdateItem = z.object({
  key:   z.string().min(1).max(100),
  value: z.string(),
});

const PatchBody = z.object({
  updates: z.array(UpdateItem).min(1).max(50),
});

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  await requireAdmin();

  const configs = await prisma.siteConfig.findMany({
    select: { key: true, value: true, updatedAt: true },
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ configs });
}

// ── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  await requireAdmin();

  const body = await request.json();
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { updates } = parsed.data;

  // Validate per-key constraints
  const validationErrors: { key: string; issue: string }[] = [];
  for (const { key, value } of updates) {
    const keySchema = SITE_CONFIG_SCHEMA[key];
    if (keySchema) {
      const result = keySchema.safeParse(value);
      if (!result.success) {
        validationErrors.push({
          key,
          issue: result.error.issues[0]?.message ?? "Invalid value",
        });
      }
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Config value validation failed", validationErrors },
      { status: 422 },
    );
  }

  // Fetch current values for audit diff
  const currentConfigs = await prisma.siteConfig.findMany({
    where: { key: { in: updates.map((u) => u.key) } },
    select: { key: true, value: true },
  });
  const currentMap = new Map(currentConfigs.map((c) => [c.key, c.value]));

  // Persist all updates
  await Promise.all(
    updates.map(({ key, value }) => SiteConfigService.set(key, value)),
  );

  // Audit log + cache invalidation per key
  const adminSession = await getAuthSession();
  const adminId = adminSession!.user.id;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0];

  await Promise.all(
    updates.map(({ key, value }) =>
      logAdminAction(
        adminId,
        "site_config.update",
        key,
        { changes: { before: currentMap.get(key) ?? null, after: value } },
        "site_config",
        ip,
      ),
    ),
  );

  // SSE notification to open admin tabs (ST006)
  const updatedKeys = updates.map((u) => u.key);
  SseManager.emitToAll("config_updated", { keys: updatedKeys });

  return NextResponse.json({ ok: true, updated: updates.length });
}
