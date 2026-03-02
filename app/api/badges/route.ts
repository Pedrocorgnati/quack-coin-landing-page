// app/api/badges/route.ts
// GET — returns all active badges with earned status for the current user,
// grouped by category.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { BadgeService } from "@/lib/services/badge.service";
import { BadgeCategory } from "@/lib/generated/prisma/client";

const CATEGORY_ORDER: BadgeCategory[] = [
  BadgeCategory.LOYALTY,
  BadgeCategory.LEARNING,
  BadgeCategory.TRADING,
  BadgeCategory.ACHIEVEMENT,
  BadgeCategory.SOCIAL,
  BadgeCategory.SPECIAL,
];

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badges = await BadgeService.getBadgesForUser(session.user.id);

  // Group by category
  const grouped: Record<string, typeof badges> = {};
  for (const badge of badges) {
    if (!grouped[badge.category]) grouped[badge.category] = [];
    grouped[badge.category]!.push(badge);
  }

  // Return ordered categories
  const result = CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => ({
    category: cat,
    badges: grouped[cat],
  }));

  return NextResponse.json(result);
}
