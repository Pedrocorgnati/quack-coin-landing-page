"use client";

// components/courses/CourseCard.tsx
// Course card displayed in the catalog grid.

import Link from "next/link";
import Image from "next/image";
import { Users, Clock, Coins, ChevronRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  qcReward: number;
  enrollmentCount: number;
  lessonCount: number;
  moduleCount: number;
  // Populated for enrolled users
  enrolledProgress?: number; // 0-100
  isEnrolled?: boolean;
}

interface CourseCardProps {
  course: CourseCardData;
  onEnroll?: (courseId: string) => void;
  enrolling?: boolean;
}

const MAX_DESC_LENGTH = 100;

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export function CourseCard({ course, onEnroll, enrolling }: CourseCardProps) {
  const isEnrolled = course.isEnrolled ?? false;
  const progress = course.enrolledProgress ?? 0;

  return (
    <article className="rounded-lg border bg-card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative h-40 bg-muted">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          /* @ASSET_PLACEHOLDER
          name: course-card-placeholder
          type: image
          format: png
          aspect_ratio: 16:9
          description: Generic course placeholder thumbnail with abstract geometric patterns
          context: Course card thumbnail fallback
          style: modern minimal geometric
          mood: clean, educational
          */
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <BookOpen className="h-12 w-12" aria-hidden="true" />
          </div>
        )}
        {/* Progress bar overlay */}
        {isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <h3 className="font-semibold leading-tight line-clamp-2">{course.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {truncate(course.description, MAX_DESC_LENGTH)}
          </p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            {course.enrollmentCount} enrolled
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {course.lessonCount} lesson{course.lessonCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* QC Badge */}
        <div className="flex items-center gap-2 mt-auto">
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Coins className="h-3 w-3" aria-hidden="true" />
            {course.qcReward} QC
          </Badge>
          {isEnrolled && progress > 0 && (
            <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
          )}
        </div>

        {/* CTA */}
        {isEnrolled ? (
          <Link href={`/courses/${course.slug}`} className="mt-1">
            <Button variant="outline" size="sm" className="w-full group">
              Continue
              <ChevronRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            className="mt-1 w-full"
            disabled={enrolling}
            onClick={() => onEnroll?.(course.id)}
          >
            {enrolling ? "Enrolling…" : "Enroll Now"}
          </Button>
        )}
      </div>
    </article>
  );
}
