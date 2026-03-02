// app/api/push/subscribe/route.ts
// POST — upserts a PushSubscription record for the current user.
// DELETE — removes the subscription (user opt-out).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;

  // Delete any existing subscription with the same endpoint (device change)
  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint },
  });

  await prisma.pushSubscription.create({
    data: {
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id, endpoint },
    });
  } else {
    // Remove ALL subscriptions for user (global opt-out)
    await prisma.pushSubscription.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return new NextResponse(null, { status: 204 });
}
