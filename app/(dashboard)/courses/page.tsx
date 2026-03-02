// app/(dashboard)/courses/page.tsx
// Public course catalog — Server Component wrapper.

import { Suspense } from "react";
import { BookOpen } from "lucide-react";
import { CourseCatalog } from "@/components/courses/CourseCatalog";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    difficulty?: string;
    page?: string;
  }>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const difficulty = params.difficulty ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
          Course Catalog
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Learn, earn QuackCoin, and unlock certificates.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <CourseCatalog
          initialSearch={search}
          initialDifficulty={difficulty}
          initialPage={page}
        />
      </Suspense>
    </div>
  );
}
