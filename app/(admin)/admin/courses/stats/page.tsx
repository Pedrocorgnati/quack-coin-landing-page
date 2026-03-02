"use client";

// app/(admin)/admin/courses/stats/page.tsx
// Enrollment statistics per course.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Award, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CourseStat {
  courseId: string;
  title: string;
  status: string;
  enrollments: number;
  completions: number;
  completionRate: number;
  totalQcDistributed: number;
}

export default function CourseStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CourseStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheHit, setCacheHit] = useState(false);

  useEffect(() => {
    fetch("/api/admin/courses/stats")
      .then(async (res) => {
        setCacheHit(res.headers.get("X-Cache") === "HIT");
        if (res.ok) {
          const data: CourseStat[] = await res.json();
          setStats(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totals = stats.reduce(
    (acc, s) => ({
      enrollments: acc.enrollments + s.enrollments,
      completions: acc.completions + s.completions,
      qc: acc.qc + s.totalQcDistributed,
    }),
    { enrollments: 0, completions: 0, qc: 0 },
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/admin/courses")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Courses
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Enrollment Statistics</h1>
          {cacheHit && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Cached (5 min)
            </Badge>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            Total Enrollments
          </div>
          <p className="text-2xl font-bold mt-1">
            {loading ? <Skeleton className="h-8 w-16" /> : totals.enrollments.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4" aria-hidden="true" />
            Completions
          </div>
          <p className="text-2xl font-bold mt-1">
            {loading ? <Skeleton className="h-8 w-16" /> : totals.completions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" aria-hidden="true" />
            QC Distributed
          </div>
          <p className="text-2xl font-bold mt-1">
            {loading ? <Skeleton className="h-8 w-16" /> : totals.qc.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Per-course table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Enrollments</TableHead>
              <TableHead className="text-center">Completions</TableHead>
              <TableHead className="text-center">Completion Rate</TableHead>
              <TableHead className="text-center">QC Distributed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : stats.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No statistics available yet.
                    </TableCell>
                  </TableRow>
                )
              : stats.map((s) => (
                  <TableRow key={s.courseId}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          s.status === "PUBLISHED"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{s.enrollments}</TableCell>
                    <TableCell className="text-center">{s.completions}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${s.completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{s.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{s.totalQcDistributed.toLocaleString()} QC</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
