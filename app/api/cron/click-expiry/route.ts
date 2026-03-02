// app/api/cron/click-expiry/route.ts
// POST — daily cron job (03:00 UTC) that finds AffiliateClicks older than
// cashback.window_days with no associated CashbackTransaction and returns count.
// Requires CRON_SECRET header.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";

const CASHBACK_WINDOW_KEY = "cashback.window_days";
const DEFAULT_WINDOW_DAYS = 30;

export async function POST(req: Request): Promise<NextResponse> {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowDaysStr = await SiteConfigService.get(CASHBACK_WINDOW_KEY).catch(() => null);
  const windowDaysParsed = windowDaysStr ? parseInt(windowDaysStr, 10) : NaN;
  const windowDays = Number.isFinite(windowDaysParsed) && windowDaysParsed > 0
    ? windowDaysParsed
    : DEFAULT_WINDOW_DAYS;

  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Find expired clicks: older than window, no conversion, no cashback
  const expired = await prisma.affiliateClick.findMany({
    where: {
      createdAt: { lt: cutoff },
      convertedAt: null,
      cashbackTx: null,
    },
    select: { id: true },
  });

  // No schema field to mark as expired; log and return count.
  // The AffiliateService.createCashback already checks convertedAt date range.
  console.log(`[click-expiry] ${expired.length} clicks past window (${windowDays}d)`);

  return NextResponse.json({ expired: expired.length });
}
