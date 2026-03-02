"use client";

// components/courses/CourseCatalog.tsx
// Course grid with sidebar filters and search.

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CourseCard, type CourseCardData } from "./CourseCard";
import { CourseFilters } from "./CourseFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface CoursesResponse {
  data: CourseCardData[];
  meta: { total: number; page: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

interface CourseCatalogProps {
  initialSearch: string;
  initialDifficulty: string;
  initialPage: number;
}

export function CourseCatalog({ initialSearch, initialDifficulty, initialPage }: CourseCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(initialPage), limit: "12" });
      if (initialSearch) params.set("search", initialSearch);
      const res = await fetch(`/api/courses?${params}`);
      if (res.ok) {
        const data: CoursesResponse = await res.json();
        setCourses(data.data);
        setMeta(data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [initialSearch, initialPage]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (initialDifficulty) params.set("difficulty", initialDifficulty);
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(t);
  }, [search, initialDifficulty, pathname, router]);

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.courseSlug) {
          router.push(`/courses/${data.courseSlug}`);
        } else {
          fetchCourses();
        }
      } else {
        const err = await res.json();
        if (err.error === "Already enrolled") {
          // Just navigate to course
          const course = courses.find((c) => c.id === courseId);
          if (course) router.push(`/courses/${course.slug}`);
        }
      }
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <div className="w-56 shrink-0 hidden md:block">
        <CourseFilters
          search={search}
          difficulty={initialDifficulty}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search courses"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${meta.total} course${meta.total !== 1 ? "s" : ""} found`}
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-lg" />
              ))
            : courses.length === 0
            ? (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  No courses match your search. Try different keywords.
                </div>
              )
            : courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnroll={handleEnroll}
                  enrolling={enrolling === course.id}
                />
              ))}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrev}
              onClick={() => {
                const params = new URLSearchParams();
                if (initialSearch) params.set("search", initialSearch);
                if (initialDifficulty) params.set("difficulty", initialDifficulty);
                params.set("page", String(meta.page - 1));
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => {
                const params = new URLSearchParams();
                if (initialSearch) params.set("search", initialSearch);
                if (initialDifficulty) params.set("difficulty", initialDifficulty);
                params.set("page", String(meta.page + 1));
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
