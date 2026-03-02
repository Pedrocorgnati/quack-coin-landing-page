// app/r/[code]/route.ts
// Affiliate redirect handler. Tracks click asynchronously, then redirects.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AffiliateService } from "@/lib/services/affiliate.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";

  const link = await prisma.affiliateLink.findUnique({
    where: { code },
    select: { id: true, url: true, isActive: true },
  });

  if (!link) {
    return NextResponse.redirect(new URL("/?ref=invalid", appUrl));
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;
  const userAgent = headersList.get("user-agent");

  // Track click non-blocking (don't await — redirect first)
  if (link.isActive) {
    void AffiliateService.trackClick(link.id, ip, userAgent).catch(() => {
      // Silently ignore tracking errors — redirect always succeeds
    });
  }

  return NextResponse.redirect(new URL(link.url), 302);
}
