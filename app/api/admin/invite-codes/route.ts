// app/api/admin/invite-codes/route.ts
// GET  ?page=&used=&active= — paginated invite code list.
// POST { count: 1|5|10|20 }  — bulk generate N codes (nanoid-style hex).
// DELETE body { code: string } — revoke single code.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireRole";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit/audit-log";
import type { Prisma } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

const GetSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  used:   z.enum(["true", "false"]).optional(),
  active: z.enum(["true", "false"]).optional(),
});

const PostSchema = z.object({
  count: z.union([
    z.literal(1),
    z.literal(5),
    z.literal(10),
    z.literal(20),
  ]).default(1),
});

const DeleteSchema = z.object({
  code: z.string().min(1),
});

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const query = GetSchema.parse({
    page:   searchParams.get("page") ?? "1",
    used:   searchParams.get("used") ?? undefined,
    active: searchParams.get("active") ?? undefined,
  });

  const where: Prisma.InviteCodeWhereInput = {};

  if (query.used === "true")  where.usedAt = { not: null };
  if (query.used === "false") where.usedAt = null;

  // "active" = not expired AND has remaining uses
  if (query.active === "true") {
    where.AND = [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    ];
  }
  if (query.active === "false") {
    where.OR = [
      { expiresAt: { lte: new Date() } },
    ];
  }

  const [total, codes] = await prisma.$transaction([
    prisma.inviteCode.count({ where }),
    prisma.inviteCode.findMany({
      where,
      include: {
        issuedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Augment with derived `isActive` field
  const now = new Date();
  const enriched = codes.map((c) => ({
    ...c,
    isActive: (c.expiresAt === null || c.expiresAt > now) && c.useCount < c.maxUses,
  }));

  return NextResponse.json({
    codes: enriched,
    total,
    page: query.page,
    pages: Math.ceil(total / PAGE_SIZE),
  });
}

// ── POST (bulk generate) ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  await requireAdmin();

  const body = await request.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { count } = parsed.data;
  const session = await (await import("@/lib/auth/getSession")).getAuthSession();
  const adminId = session!.user.id;

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Generate `count` unique codes (12-char hex = 6 random bytes → 12 hex chars)
  const generated = await Promise.all(
    Array.from({ length: count }, async () => {
      const code = crypto.randomBytes(6).toString("hex"); // 12 chars
      return prisma.inviteCode.create({
        data: { code, issuedById: adminId, maxUses: 1, expiresAt },
      });
    }),
  );

  await logAdminAction(
    adminId,
    "invite_code.generate",
    adminId,
    { count, codes: generated.map((c) => c.code) },
    "invite_code",
    request.headers.get("x-forwarded-for")?.split(",")[0],
  );

  return NextResponse.json({ codes: generated }, { status: 201 });
}

// ── DELETE (revoke) ────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  await requireAdmin();

  const body = await request.json();
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { code } = parsed.data;

  const invite = await prisma.inviteCode.findUnique({ where: { code } });
  if (!invite) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  // Revoke: set expiresAt to now (code is immediately invalid)
  await prisma.inviteCode.update({
    where: { code },
    data: { expiresAt: new Date() },
  });

  const session = await (await import("@/lib/auth/getSession")).getAuthSession();
  const adminId = session!.user.id;

  await logAdminAction(
    adminId,
    "invite_code.revoke",
    invite.id,
    { code },
    "invite_code",
    request.headers.get("x-forwarded-for")?.split(",")[0],
  );

  return NextResponse.json({ ok: true });
}
