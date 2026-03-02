"use client";

// components/courses/LessonViewer.tsx
// Video embed or markdown content viewer with mark-complete button.

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonViewerProps {
  lessonId: string;
  lessonTitle: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "ASSIGNMENT";
  content: string | null;
  videoUrl: string | null;
  prevLessonPath: string | null;
  nextLessonPath: string | null;
  isCompleted: boolean;
  onMarkComplete: () => Promise<void>;
}

function VideoEmbed({ url }: { url: string }) {
  // Convert YouTube watch URL to embed URL
  let embedUrl = url;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return (
    <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title="Lesson video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}

export function LessonViewer({
  lessonId,
  lessonTitle,
  type,
  content,
  videoUrl,
  prevLessonPath,
  nextLessonPath,
  isCompleted,
  onMarkComplete,
}: LessonViewerProps) {
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [qcEarned, setQcEarned] = useState<number | null>(null);

  async function handleMarkComplete() {
    if (completed || completing) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/courses/lessons/${lessonId}/complete`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCompleted(true);
        setQcEarned(data.qcEarned ?? 0);
        await onMarkComplete();
      }
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Title */}
      <h1 className="text-2xl font-bold">{lessonTitle}</h1>

      {/* Content */}
      {type === "VIDEO" && videoUrl ? (
        <VideoEmbed url={videoUrl} />
      ) : content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {content}
        </div>
      ) : (
        <p className="text-muted-foreground italic">No content available for this lesson yet.</p>
      )}

      {/* QC earned toast */}
      {qcEarned !== null && qcEarned > 0 && (
        <div
          className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-700 dark:text-green-400"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Lesson completed! You earned <strong>{qcEarned} QC</strong>.
        </div>
      )}

      {/* Navigation + Mark complete */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <div className="flex gap-2">
          {prevLessonPath ? (
            <Link href={prevLessonPath}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Previous
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Previous
            </Button>
          )}
        </div>

        {!completed ? (
          <Button onClick={handleMarkComplete} disabled={completing}>
            {completing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Mark Complete
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Completed
          </div>
        )}

        <div className="flex gap-2">
          {nextLessonPath ? (
            <Link href={nextLessonPath}>
              <Button size="sm">
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" disabled>
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
