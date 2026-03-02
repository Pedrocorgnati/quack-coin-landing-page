// app/api/courses/lessons/[lessonId]/complete/route.ts
// POST /api/courses/lessons/:lessonId/complete
// Marks a lesson as complete for the current user, updates CourseProgress,
// and emits QC events. If all lessons complete, triggers course completion.

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { handleQcEvent } from "@/lib/events/qcEventHandler";
import { NotificationService } from "@/lib/services/notification.service";
import { generateCertificate } from "@/lib/certificates/generator";
import { NotificationType, CourseStatus } from "@/lib/generated/prisma/client";
import { BadgeService } from "@/lib/services/badge.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  // Load lesson with its courseModule and course
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      courseModule: {
        include: { course: true },
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const courseId = lesson.courseModule.courseId;
  const userId = session.user.id;

  // Ensure user is enrolled
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
  }

  // Idempotent: create LessonProgress only if not already completed
  const existingProgress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  let qcEarned = 0;
  if (!existingProgress) {
    // Mark lesson complete
    await prisma.lessonProgress.create({
      data: { userId, lessonId },
    });

    // Emit lesson_complete QC event (idempotent via qcEventHandler)
    const qcResult = await handleQcEvent({ type: "lesson_complete", userId, lessonId });
    qcEarned = qcResult?.earned ?? 0;

    // Notify user (fire-and-forget)
    NotificationService.send(userId, NotificationType.LESSON_COMPLETED, {
      type: NotificationType.LESSON_COMPLETED,
      data: { lessonId, lessonTitle: lesson.title, qcEarned },
    }).catch(() => undefined);

    // Badge check (fire-and-forget)
    void BadgeService.check({ type: "lesson_complete", userId, lessonId }).catch(() => {});
  }

  // Recalculate CourseProgress
  const [completedCount, totalCount] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, lesson: { courseModule: { courseId } } },
    }),
    prisma.lesson.count({ where: { courseModule: { courseId } } }),
  ]);

  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  await prisma.courseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      lessonsCompleted: completedCount,
      totalLessons: totalCount,
      percentComplete: percentage,
      lastActivityAt: new Date(),
    },
    update: {
      lessonsCompleted: completedCount,
      totalLessons: totalCount,
      percentComplete: percentage,
      lastActivityAt: new Date(),
    },
  });

  // Course complete?
  let certificate: { id: string } | null = null;
  if (completedCount >= totalCount && totalCount > 0 && !enrollment.completedAt) {
    await onCourseComplete(userId, courseId, lesson.courseModule.course.title, lesson.courseModule.course.qcReward);

    const cert = await generateCertificate(userId, courseId);
    certificate = { id: cert.id };
  }

  return NextResponse.json({
    lessonId,
    completed: true,
    qcEarned,
    progress: { completedLessons: completedCount, totalLessons: totalCount, percentage },
    certificateId: certificate?.id ?? null,
  });
}

/**
 * Called when all lessons in a course are completed.
 * Marks enrollment as complete, emits course_complete QC event, sends notification.
 */
async function onCourseComplete(
  userId: string,
  courseId: string,
  courseTitle: string,
  _qcReward: number,
): Promise<void> {
  // Mark enrollment completed
  await prisma.courseEnrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: { completedAt: new Date() },
  });

  // Emit course_complete QC event (idempotent)
  const qcResult = await handleQcEvent({ type: "course_complete", userId, courseId });
  const qcEarned = qcResult?.earned ?? 0;

  // Notify user
  await NotificationService.send(userId, NotificationType.COURSE_COMPLETED, {
    type: NotificationType.COURSE_COMPLETED,
    data: {
      courseId,
      courseTitle,
      qcEarned,
      certificateUrl: `/courses/certificate/${courseId}`,
    },
  }).catch(() => undefined);

  // Check if user completed ALL published courses
  const [totalCourses, completedCourses] = await Promise.all([
    prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
    prisma.courseEnrollment.count({
      where: { userId, completedAt: { not: null } },
    }),
  ]);
  const allCoursesComplete = completedCourses >= totalCourses && totalCourses > 0;

  // Badge check (fire-and-forget)
  void BadgeService.check({
    type: "course_complete",
    userId,
    courseId,
    allCoursesComplete,
  }).catch(() => {});
}
