// app/api/courses/[courseId]/enroll/route.ts
// POST /api/courses/:courseId/enroll — enroll the current user in a course.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@/lib/generated/prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;

  // Course must exist and be published
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        take: 1,
      },
    },
  });

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (course.status !== CourseStatus.PUBLISHED) {
    return NextResponse.json({ error: "Course is not available" }, { status: 422 });
  }

  // Check already enrolled
  const existing = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  }

  await prisma.courseEnrollment.create({
    data: { userId: session.user.id, courseId },
  });

  // Find first lesson slug via module → lesson
  const firstLesson = course.modules[0]?.lessons[0];
  const firstLessonSlug = firstLesson
    ? `${course.modules[0]!.id}/${firstLesson.id}`
    : null;

  return NextResponse.json({ enrolled: true, courseSlug: course.slug, firstLessonId: firstLesson?.id ?? null }, { status: 201 });
}
