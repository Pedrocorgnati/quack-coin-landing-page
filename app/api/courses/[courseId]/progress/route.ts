// app/api/courses/[courseId]/progress/route.ts
// GET /api/courses/:courseId/progress — returns current user's progress for a course.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;

  const [enrollment, courseProgress] = await Promise.all([
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    }),
    prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    }),
  ]);

  if (!enrollment) {
    return NextResponse.json({ enrolled: false, percentage: 0, completedLessons: 0, totalLessons: 0 });
  }

  // Count total lessons in course
  const totalResult = await prisma.lesson.count({
    where: { courseModule: { courseId } },
  });

  const completedLessons = courseProgress?.lessonsCompleted ?? 0;
  const totalLessons = totalResult;
  const percentage = courseProgress?.percentComplete ?? 0;
  const completed = enrollment.completedAt !== null;

  let certificate: { id: string; issuedAt: Date } | null = null;
  if (completed) {
    certificate = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
      select: { id: true, issuedAt: true },
    });
  }

  return NextResponse.json({
    enrolled: true,
    enrolledAt: enrollment.enrolledAt,
    completedAt: enrollment.completedAt,
    completedLessons,
    totalLessons,
    percentage,
    completed,
    certificate: certificate ?? undefined,
  });
}
