"use client";

// components/courses/LessonViewerWrapper.tsx
// Thin client wrapper around LessonViewer that provides the onMarkComplete callback.

import { useRouter } from "next/navigation";
import { LessonViewer } from "./LessonViewer";
import type { LessonType } from "@/lib/generated/prisma/client";

interface LessonViewerWrapperProps {
  lessonId: string;
  lessonTitle: string;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  prevLessonPath: string | null;
  nextLessonPath: string | null;
  isCompleted: boolean;
  courseSlug: string;
}

export function LessonViewerWrapper(props: LessonViewerWrapperProps) {
  const router = useRouter();

  async function onMarkComplete() {
    router.refresh();
  }

  return <LessonViewer {...props} onMarkComplete={onMarkComplete} />;
}
