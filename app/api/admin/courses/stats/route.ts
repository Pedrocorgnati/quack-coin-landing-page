// app/api/admin/courses/stats/route.ts
// GET /api/admin/courses/stats — enrollment and completion statistics per course.
// Cached in Redis for 5 minutes.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const CACHE_KEY = "admin:courses:stats";
const CACHE_TTL = 300; // 5 minutes

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try cache first
  const cached = await redis.get(CACHE_KEY).catch(() => null);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get completion and QC stats per course
  const stats = await Promise.all(
    courses.map(async (course) => {
      const [completions, totalQcDistributed] = await Promise.all([
        prisma.courseEnrollment.count({
          where: { courseId: course.id, completedAt: { not: null } },
        }),
        prisma.quackCoinTransaction.aggregate({
          where: {
            userId: { not: "" },
            reason: { contains: course.id },
            type: "EARN",
          },
          _sum: { amount: true },
        }),
      ]);

      const enrollments = course._count.enrollments;
      const completionRate =
        enrollments > 0 ? Math.round((completions / enrollments) * 100) : 0;

      return {
        courseId: course.id,
        title: course.title,
        status: course.status,
        enrollments,
        completions,
        completionRate,
        totalQcDistributed: totalQcDistributed._sum.amount ?? 0,
      };
    }),
  );

  await redis.set(CACHE_KEY, stats, { ex: CACHE_TTL }).catch(() => undefined);

  return NextResponse.json(stats, { headers: { "X-Cache": "MISS" } });
}
