// app/api/user/profile/route.ts
// GET: return current user profile | PATCH: update displayName, avatarUrl

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth/getSession";

const updateSchema = z.object({
  displayName: z.string().min(3).max(50).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      membershipTier: true,
      membershipExpiresAt: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) updateData.name = parsed.data.displayName;
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl || null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      membershipTier: true,
    },
  });

  return NextResponse.json({ user });
}
