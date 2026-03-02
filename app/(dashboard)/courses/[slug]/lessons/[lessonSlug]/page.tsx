// app/(dashboard)/courses/[slug]/lessons/[lessonSlug]/page.tsx
// Lesson viewer page — Server Component.
// Renders LessonViewer for the given lesson. Handles enrollment guard.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@/lib/generated/prisma/client";
import { LessonViewerWrapper } from "@/components/courses/LessonViewerWrapper";

interface PageProps {
  params: Promise<{ slug: string; lessonSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonSlug } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonSlug },
    select: { title: true },
  });
  return { title: lesson?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonSlug } = await params;
  const session = await getAuthSession();
  if (!session) redirect("/login");

  // Load the course (by slug or id)
  const course = await prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }], status: CourseStatus.PUBLISHED },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, type: true, sortOrder: true },
          },
        },
      },
    },
  });

  if (!course) notFound();

  // Enrollment guard
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    select: { id: true },
  });
  if (!enrollment) redirect(`/courses/${course.slug}`);

  // Load the specific lesson with full content
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonSlug, courseModule: { courseId: course.id } },
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      videoUrl: true,
      courseModule: { select: { id: true, sortOrder: true } },
    },
  });

  if (!lesson) notFound();

  // Build flat ordered lesson list for prev/next navigation
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const currentIdx = allLessons.findIndex((l) => l.id === lessonSlug);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const prevPath = prevLesson
    ? `/courses/${course.slug}/lessons/${prevLesson.id}`
    : null;
  const nextPath = nextLesson
    ? `/courses/${course.slug}/lessons/${nextLesson.id}`
    : null;

  // Check if already completed
  const lessonProgress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId: lesson.id } },
    select: { id: true },
  });
  const isCompleted = !!lessonProgress;

  return (
    <div className="p-6">
      <LessonViewerWrapper
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        type={lesson.type}
        content={lesson.content}
        videoUrl={lesson.videoUrl}
        prevLessonPath={prevPath}
        nextLessonPath={nextPath}
        isCompleted={isCompleted}
        courseSlug={course.slug}
      />
    </div>
  );
}
