"use client";

// components/courses/CourseCurriculum.tsx
// Accordion showing modules > lessons with completion state and lock icons.

import Link from "next/link";
import { Lock, CheckCircle2, Play, FileText, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LessonType } from "@/lib/generated/prisma/client";

interface LessonItem {
  id: string;
  title: string;
  type: LessonType;
  durationSecs: number | null;
}

interface ModuleItem {
  id: string;
  title: string;
  lessons: LessonItem[];
}

interface CourseCurriculumProps {
  courseSlug: string;
  modules: ModuleItem[];
  isEnrolled: boolean;
  completedLessonIds?: Set<string>;
}

function formatDuration(secs: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const LESSON_ICON: Record<LessonType, React.ReactNode> = {
  VIDEO: <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  ARTICLE: <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  QUIZ: <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  ASSIGNMENT: <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
};

export function CourseCurriculum({
  courseSlug,
  modules,
  isEnrolled,
  completedLessonIds = new Set(),
}: CourseCurriculumProps) {
  const defaultOpen = modules.length > 0 ? [modules[0]!.id] : [];

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      {modules.map((mod, modIdx) => {
        const completedInModule = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
        return (
          <AccordionItem key={mod.id} value={mod.id}>
            <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2 text-left">
                <span className="text-muted-foreground text-xs w-5 text-right">{modIdx + 1}.</span>
                {mod.title}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({completedInModule}/{mod.lessons.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <ul className="space-y-0.5 pb-3">
                {mod.lessons.map((lesson) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const lessonPath = `/courses/${courseSlug}/lessons/${lesson.id}`;

                  const inner = (
                    <span className="flex items-center gap-2 py-1.5 px-2 rounded text-sm w-full text-left">
                      {isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden="true" />
                      ) : isEnrolled ? (
                        LESSON_ICON[lesson.type]
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                      )}
                      <span className={`flex-1 truncate ${isCompleted ? "text-muted-foreground" : ""}`}>
                        {lesson.title}
                      </span>
                      {lesson.durationSecs && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDuration(lesson.durationSecs)}
                        </span>
                      )}
                    </span>
                  );

                  return (
                    <li key={lesson.id}>
                      {isEnrolled ? (
                        <Link
                          href={lessonPath}
                          className="block hover:bg-muted rounded transition-colors"
                          aria-label={`${lesson.title}${isCompleted ? " (completed)" : ""}`}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span className="block">{inner}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
