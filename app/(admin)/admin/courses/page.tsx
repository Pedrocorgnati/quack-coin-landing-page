"use client";

// app/(admin)/admin/courses/page.tsx
// Admin course list with search, status filter, and enrollment/completion stats.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Users, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CourseStatus } from "@/lib/generated/prisma/client";

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  qcReward: number;
  moduleCount: number;
  lessonCount: number;
  enrollmentCount: number;
  createdAt: string;
}

interface CoursesResponse {
  data: CourseRow[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

const STATUS_BADGE: Record<CourseStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  PUBLISHED: { label: "Published", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  ARCHIVED: { label: "Archived", className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/courses?${params}`);
      if (res.ok) {
        const json: CoursesResponse = await res.json();
        setCourses(json.data);
        setTotal(json.meta.total);
        setTotalPages(json.meta.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchCourses, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchCourses, search]);

  async function handlePublish(courseId: string, currentStatus: CourseStatus) {
    setPublishing(courseId);
    try {
      const method = currentStatus === "PUBLISHED" ? "DELETE" : "POST";
      const res = await fetch(`/api/admin/courses/${courseId}/publish`, { method });
      if (res.ok) fetchCourses();
      else {
        const err = await res.json();
        alert(err.error ?? "Failed to publish course");
      }
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(courseId: string) {
    if (!confirm("Delete this course? This action cannot be undone.")) return;
    setDeleting(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) fetchCourses();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the Education CMS — create, edit, and publish courses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/courses/stats")}>
            <BarChart2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Stats
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/courses/new")}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Course
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="sm:max-w-xs"
          aria-label="Search courses"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} course{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="text-center">Modules</TableHead>
              <TableHead className="text-center">Lessons</TableHead>
              <TableHead className="text-center">Enrolled</TableHead>
              <TableHead className="text-center">QC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : courses.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No courses found. Create your first course!
                    </TableCell>
                  </TableRow>
                )
              : courses.map((course) => {
                  const badge = STATUS_BADGE[course.status];
                  const isPublished = course.status === "PUBLISHED";
                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell className="text-center">{course.moduleCount}</TableCell>
                      <TableCell className="text-center">{course.lessonCount}</TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3" aria-hidden="true" />
                          {course.enrollmentCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{course.qcReward} QC</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/courses/${course.id}/modules`)}
                          >
                            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Manage modules</span>
                          </Button>
                          <Button
                            variant={isPublished ? "outline" : "default"}
                            size="sm"
                            disabled={publishing === course.id}
                            onClick={() => handlePublish(course.id, course.status)}
                          >
                            {publishing === course.id
                              ? "…"
                              : isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deleting === course.id}
                            onClick={() => handleDelete(course.id)}
                          >
                            {deleting === course.id ? "…" : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
