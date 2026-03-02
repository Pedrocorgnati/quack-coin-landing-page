// app/api/courses/route.ts
// GET /api/courses — public course catalog (PUBLISHED only).
// Supports: search, page, limit query params.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { CourseStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const ENROLLMENT_CACHE_TTL = 60; // seconds

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    status: CourseStatus.PUBLISHED,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        status: true,
        qcReward: true,
        sortOrder: true,
        createdAt: true,
        modules: {
          select: {
            _count: { select: { lessons: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  // Get cached enrollment counts or use the _count from the query
  const data = await Promise.all(
    courses.map(async (course) => {
      const cacheKey = `course:${course.id}:enrollment_count`;
      const cached = await redis.get<number>(cacheKey).catch(() => null);
      const enrollmentCount =
        cached !== null ? cached : course._count.enrollments;

      // Refresh cache if miss
      if (cached === null) {
        await redis
          .set(cacheKey, course._count.enrollments, { ex: ENROLLMENT_CACHE_TTL })
          .catch(() => undefined);
      }

      const lessonCount = course.modules.reduce((n, m) => n + m._count.lessons, 0);

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        status: course.status,
        qcReward: course.qcReward,
        enrollmentCount,
        lessonCount,
        moduleCount: course.modules.length,
        createdAt: course.createdAt,
      };
    }),
  );

  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({
    data,
    meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}
