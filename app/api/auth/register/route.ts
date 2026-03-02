// app/api/auth/register/route.ts
// Invite-gated user registration endpoint.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { InviteService } from "@/lib/services/invite.service";

const registerSchema = z.object({
  inviteCode: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
  confirmPassword: z.string(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { inviteCode, email, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  // Validate invite code
  const invite = await InviteService.validate(inviteCode);
  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (existing) {
    // Return generic error — no email enumeration
    return NextResponse.json(
      { error: "Registration failed. Please check your details." },
      { status: 400 },
    );
  }

  // Hash password
  const passwordHash = await hash(password, 12);

  // Create user and consume invite in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        membershipTier: "FREE",
        role: "USER",
        // Wire referral tracking: set invitedById to the invite issuer
        invitedById: invite.issuedById,
      },
    });

    await tx.inviteCode.update({
      where: { code: inviteCode.trim() },
      data: {
        useCount: { increment: 1 },
        usedByEmail: newUser.email,
        usedAt: new Date(),
      },
    });

    return newUser;
  });

  // Notify inviter of new referral
  void import("@/lib/services/notification.service")
    .then(({ NotificationService }) =>
      import("@/lib/generated/prisma/client").then(({ NotificationType }) =>
        NotificationService.send(invite.issuedById, NotificationType.REFERRAL_REWARD, {
          type: NotificationType.REFERRAL_REWARD,
          data: { referredUserName: user.name ?? user.email, qcEarned: 0 },
        }),
      ),
    )
    .catch(() => {});

  return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
}
