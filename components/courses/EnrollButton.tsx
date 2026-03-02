"use client";

// components/courses/EnrollButton.tsx
// Client-side enroll CTA used on course detail page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
}

export function EnrollButton({ courseId, courseSlug }: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        if (data.error === "Already enrolled") {
          router.refresh();
        } else {
          setError(data.error ?? "Enrollment failed. Please try again.");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="lg" onClick={handleEnroll} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            Enrolling…
          </>
        ) : (
          "Enroll Now — Free"
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
