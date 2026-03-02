// app/api/auth/forgot-password/route.ts
// Initiates the password reset flow. Always returns success to prevent email enumeration.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { resend, FROM_ADDRESS } from "@/lib/email/mailer";
import { PasswordResetEmail } from "@/lib/email/passwordReset.template";
import { render } from "@react-email/components";
import { env } from "@/lib/env";

const schema = z.object({ email: z.string().email() });

const SUCCESS_MESSAGE =
  "If that email exists, you'll receive a reset link shortly.";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await withRateLimit(`forgot_pw:${ip}`, 3, "900 s"); // 3 per 15 min

  if (!rl.success) {
    // Still return success to prevent enumeration
    return NextResponse.json({ message: SUCCESS_MESSAGE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: SUCCESS_MESSAGE });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: SUCCESS_MESSAGE });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true },
  });

  if (!user) {
    // Always return success
    return NextResponse.json({ message: SUCCESS_MESSAGE });
  }

  // Generate reset token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const resetLink = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  // Send email (non-blocking — errors are swallowed to prevent enumeration)
  await resend.emails
    .send({
      from: FROM_ADDRESS,
      to: user.email,
      subject: "Reset your QuackCoin password",
      react: PasswordResetEmail({ resetLink, expiryMinutes: 60 }),
    })
    .catch((err: unknown) => {
      console.error("[forgot-password] Failed to send email:", err);
    });

  return NextResponse.json({ message: SUCCESS_MESSAGE });
}
