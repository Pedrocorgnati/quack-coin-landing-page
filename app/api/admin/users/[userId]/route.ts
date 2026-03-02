// app/api/admin/users/[userId]/route.ts
// GET: full user detail with all relations.
// PATCH: ban/unban, role change, membership override. Writes audit log.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit/audit-log";
import { z } from "zod";

const PatchSchema = z.object({
  banned: z.boolean().optional(),
  bannedReason: z.string().max(500).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  membershipTier: z.enum(["FREE", "SILVER", "GOLD", "PLATINUM"]).optional(),
  membershipExpiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  await requireAdmin();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBanned: true,
      bannedReason: true,
      bannedAt: true,
      emailVerified: true,
      membershipTier: true,
      membershipExpiresAt: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      // passwordHash, twoFactorSecret, backupCodeHashes intentionally excluded
      membershipPayments: { orderBy: { createdAt: "desc" }, take: 10 },
      qcTransactions: { orderBy: { createdAt: "desc" }, take: 50 },
      stakingPositions: { orderBy: { createdAt: "desc" }, take: 10 },
      userBadges: { include: { badge: true }, take: 20 },
      invitees: { select: { id: true, email: true, createdAt: true }, take: 20 },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await requireAdmin();
  const { userId } = await params;

  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
  }

  const { banned, bannedReason, role, membershipTier, membershipExpiresAt } = parsed.data;

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, role: true, membershipTier: true, membershipExpiresAt: true, bannedReason: true },
  });
  if (!current) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  if (banned !== undefined) {
    updateData.isBanned = banned;
    updateData.bannedAt = banned ? new Date() : null;
    updateData.bannedReason = banned ? (bannedReason ?? current.bannedReason) : null;
    changes.banned = { before: current.isBanned, after: banned };
  }

  if (role !== undefined) {
    updateData.role = role;
    changes.role = { before: current.role, after: role };
  }

  if (membershipTier !== undefined) {
    updateData.membershipTier = membershipTier;
    changes.membershipTier = { before: current.membershipTier, after: membershipTier };
  }

  if (membershipExpiresAt !== undefined) {
    updateData.membershipExpiresAt = membershipExpiresAt ? new Date(membershipExpiresAt) : null;
    changes.membershipExpiresAt = {
      before: current.membershipExpiresAt?.toISOString() ?? null,
      after: membershipExpiresAt,
    };
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      role: true,
      isBanned: true,
      bannedReason: true,
      membershipTier: true,
      membershipExpiresAt: true,
    },
  });

  // Determine action type for audit log
  const adminSession = await getAuthSession();
  const adminId = adminSession!.user.id;

  const action = banned !== undefined
    ? banned ? "user.ban" : "user.unban"
    : role !== undefined
    ? "user.role_change"
    : "user.membership_override";

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;

  await logAdminAction(
    adminId,
    action,
    userId,
    { changes, reason: bannedReason },
    "user",
    ip,
  );

  return NextResponse.json({ user: updated });
}
