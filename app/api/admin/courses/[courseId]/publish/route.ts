// app/api/admin/courses/[courseId]/publish/route.ts
// POST — publish a course (validates all lessons have content).
// DELETE — unpublish (revert to DRAFT).

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@/lib/generated/prisma/client";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { lessons: { select: { id: true, content: true, videoUrl: true } } },
      },
    },
  });

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (course.status === CourseStatus.PUBLISHED) {
    return NextResponse.json({ error: "Course is already published" }, { status: 409 });
  }

  // Validate: course must have at least one module + one lesson
  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) {
    return NextResponse.json(
      { error: "Course must have at least one lesson before publishing" },
      { status: 422 },
    );
  }

  // Validate: all lessons must have content or videoUrl
  const emptyLessons = allLessons.filter((l) => !l.content && !l.videoUrl);
  if (emptyLessons.length > 0) {
    return NextResponse.json(
      {
        error: `${emptyLessons.length} lesson(s) have no content. Add content to all lessons before publishing.`,
        emptyLessonIds: emptyLessons.map((l) => l.id),
      },
      { status: 422 },
    );
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: CourseStatus.PUBLISHED },
  });

  return NextResponse.json({ published: true, course: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: CourseStatus.DRAFT },
  });

  return NextResponse.json({ published: false, course: updated });
}
