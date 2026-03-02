// app/(dashboard)/courses/[slug]/page.tsx
// Course detail page — shows hero, curriculum accordion, enroll/continue CTA.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, Clock, Users, CheckCircle2, Award } from "lucide-react";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@/lib/generated/prisma/client";
import { CourseCurriculum } from "@/components/courses/CourseCurriculum";
import { EnrollButton } from "@/components/courses/EnrollButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }], status: CourseStatus.PUBLISHED },
    select: { title: true, description: true },
  });
  if (!course) return { title: "Course Not Found" };
  return {
    title: course.title,
    description: course.description ?? undefined,
  };
}

function formatDuration(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getAuthSession();

  // Load course with modules + lessons
  const course = await prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }], status: CourseStatus.PUBLISHED },
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

  if (!course) notFound();

  // Check enrollment and completed lessons for this user
  let isEnrolled = false;
  let completedLessonIds = new Set<string>();
  let firstLessonId: string | null = null;
  let progressPercent = 0;
  let certificateId: string | null = null;

  if (session?.user?.id) {
    const [enrollment, progress, certificate] = await Promise.all([
      prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
        select: { id: true, completedAt: true },
      }),
      prisma.courseProgress.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
        select: { percentComplete: true },
      }),
      prisma.certificate.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
        select: { id: true },
      }),
    ]);

    isEnrolled = !!enrollment;
    progressPercent = progress?.percentComplete ?? 0;
    certificateId = certificate?.id ?? null;

    if (isEnrolled) {
      const completedLessons = await prisma.lessonProgress.findMany({
        where: { userId: session.user.id, lesson: { courseModule: { courseId: course.id } } },
        select: { lessonId: true },
      });
      completedLessonIds = new Set(completedLessons.map((lp) => lp.lessonId));
    }
  }

  // First available lesson
  for (const mod of course.modules) {
    if (mod.lessons.length > 0) {
      firstLessonId = mod.lessons[0]!.id;
      break;
    }
  }

  // Stats
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalSecs = course.modules
    .flatMap((m) => m.lessons)
    .reduce((sum, l) => sum + (l.durationSecs ?? 0), 0);
  const enrollmentCount = course._count.enrollments;

  return (
    <div className="max-w-4xl space-y-8 p-6">
      {/* Back */}
      <Link
        href="/courses"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Catalog
      </Link>

      {/* Hero */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {course.qcReward > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
              +{course.qcReward} QC on completion
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold leading-tight">{course.title}</h1>

        {course.description && (
          <p className="text-muted-foreground text-base leading-relaxed">
            {course.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
          </span>
          {totalSecs > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatDuration(totalSecs)} total
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden="true" />
            {enrollmentCount.toLocaleString("en-US")} enrolled
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {!session ? (
            <Link href="/login">
              <Button size="lg">Sign in to Enroll</Button>
            </Link>
          ) : isEnrolled ? (
            <>
              {firstLessonId && (
                <Link href={`/courses/${course.slug}/lessons/${firstLessonId}`}>
                  <Button size="lg">
                    {progressPercent > 0 ? "Continue Learning" : "Start Course"}
                  </Button>
                </Link>
              )}
              {progressPercent > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span>{Math.round(progressPercent)}% complete</span>
                </div>
              )}
              {certificateId && (
                <Link href={`/courses/certificate/${certificateId}`}>
                  <Button variant="outline" size="lg">
                    <Award className="h-4 w-4 mr-2" aria-hidden="true" />
                    View Certificate
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <EnrollButton courseId={course.id} courseSlug={course.slug} />
          )}
        </div>
      </div>

      {/* What you'll learn / already completed */}
      {isEnrolled && completedLessonIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {completedLessonIds.size} of {totalLessons} lessons completed
          </span>
        </div>
      )}

      {/* Curriculum */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Course Curriculum</h2>
        <p className="text-sm text-muted-foreground">
          {course.modules.length} module{course.modules.length !== 1 ? "s" : ""} &middot;{" "}
          {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
        </p>
        <CourseCurriculum
          courseSlug={course.slug}
          modules={course.modules}
          isEnrolled={isEnrolled}
          completedLessonIds={completedLessonIds}
        />
      </div>
    </div>
  );
}
