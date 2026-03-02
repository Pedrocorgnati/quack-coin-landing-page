// app/api/internal/system-alert/route.ts
// POST /api/internal/system-alert — internal endpoint called by cron/http-caller.ts
// when a cron job fails 3 consecutive times. Requires Bearer CRON_SECRET.
// Sends an email to all admin users via Resend.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import { prisma } from "@/lib/prisma";
import { resend, FROM_ADDRESS } from "@/lib/email/mailer";
import { Role } from "@/lib/generated/prisma/client";

const BodySchema = z.object({
  type: z.literal("CRON_FAILURE"),
  jobName: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate via cron secret
  const auth = req.headers.get("authorization");
  if (!verifyCronSecret(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { jobName, message } = parsed.data;

  // Fetch admin email addresses
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { email: true },
  });

  const adminEmails = admins
    .map((a) => a.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);

  if (adminEmails.length === 0) {
    console.warn("[system-alert] No admin emails found — alert not sent for job:", jobName);
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Send email alerts (fire-and-forget per address)
  const results = await Promise.allSettled(
    adminEmails.map((to) =>
      resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject: `[QuackCoin] Cron failure: ${jobName}`,
        html: `
          <p>The cron job <strong>${jobName}</strong> has failed 3 consecutive times.</p>
          <p><strong>Last error:</strong> ${message}</p>
          <p>Please check the server logs or the admin dashboard cron status panel.</p>
          <hr />
          <p style="font-size:12px;color:#888;">QuackCoin Admin Alert — do not reply to this email.</p>
        `,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  if (failed > 0) {
    console.error(`[system-alert] ${failed}/${results.length} alert emails failed for job: ${jobName}`);
  } else {
    console.log(`[system-alert] Sent ${sent} alert email(s) for failed job: ${jobName}`);
  }

  return NextResponse.json({ ok: true, sent, failed });
}
