// app/api/webhooks/affiliate/route.ts
// External affiliate partner webhook.
// Validates X-Partner-Signature header (HMAC-SHA256 with AFFILIATE_WEBHOOK_SECRET).
// Creates a CashbackTransaction from the conversion data.
// Disabled if AFFILIATE_WEBHOOK_SECRET is not set.

import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { AffiliateService } from "@/lib/services/affiliate.service";
import { z } from "zod";

const payloadSchema = z.object({
  /** ID of the AffiliateClick that led to this conversion */
  clickId: z.string().min(1),
  conversionValue: z.number().positive(),
  currency: z.string().default("USD"),
  referredUserId: z.string().optional(),
});

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Constant-time comparison
  try {
    return require("crypto").timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.AFFILIATE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-partner-signature") ?? "";

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { clickId, conversionValue, referredUserId } = parsed.data;

  // Verify click exists
  const click = await prisma.affiliateClick.findUnique({
    where: { id: clickId },
    select: { id: true, cashbackTx: true },
  });

  if (!click) {
    return NextResponse.json({ error: "Click not found" }, { status: 404 });
  }
  if (click.cashbackTx) {
    return NextResponse.json({ error: "Cashback already created for this click" }, { status: 409 });
  }

  // Mark click as converted
  await prisma.affiliateClick.update({
    where: { id: clickId },
    data: { convertedAt: new Date() },
  });

  try {
    await AffiliateService.createCashback(clickId, conversionValue, referredUserId);
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create cashback";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
