// app/api/courses/[courseId]/route.ts
// GET /api/courses/:courseId — public course detail (by id or slug).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@/lib/generated/prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<NextResponse> {
  const { courseId } = await params;

  // Try by id first, then by slug
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseId }, { slug: courseId }],
      status: CourseStatus.PUBLISHED,
    },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              durationSecs: true,
              sortOrder: true,
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  return NextResponse.json({
    ...course,
    enrollmentCount: course._count.enrollments,
  });
}
