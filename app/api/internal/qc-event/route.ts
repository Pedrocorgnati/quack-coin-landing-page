// app/api/internal/qc-event/route.ts
// Internal-only endpoint for dispatching QC events from cron jobs or Server Actions.
// Protected by CRON_SECRET header — never exposed to the public.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleQcEvent } from "@/lib/events/qcEventHandler";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import type { QcEarnEvent } from "@/lib/events/qcEvents";

const qcEarnEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily_login"), userId: z.string().cuid() }),
  z.object({
    type: z.literal("lesson_complete"),
    userId: z.string().cuid(),
    lessonId: z.string(),
  }),
  z.object({
    type: z.literal("course_complete"),
    userId: z.string().cuid(),
    courseId: z.string(),
  }),
  z.object({
    type: z.literal("stake_deposit"),
    userId: z.string().cuid(),
    amount: z.number().positive(),
  }),
  z.object({
    type: z.literal("raffle_enter"),
    userId: z.string().cuid(),
    ticketCount: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("badge_unlock"),
    userId: z.string().cuid(),
    badgeId: z.string(),
  }),
  z.object({ type: z.literal("profile_complete"), userId: z.string().cuid() }),
  z.object({
    type: z.literal("referral"),
    userId: z.string().cuid(),
    referredUserId: z.string().cuid(),
  }),
]);

const bodySchema = z.object({
  event: qcEarnEventSchema,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth: timing-safe CRON_SECRET check
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: QcEarnEvent;
  try {
    const body = (await request.json()) as unknown;
    const parsed = bodySchema.parse(body);
    event = parsed.event;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await handleQcEvent(event);
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    console.error("[qc-event] Error handling event:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
