// app/api/admin/courses/route.ts
// GET /api/admin/courses — paginated list of all courses with enrollment counts.
// POST /api/admin/courses — create a new course.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { CourseStatus } from "@/lib/generated/prisma/client";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  slug: z.string().min(2).max(100).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  qcReward: z.number().int().min(0).default(50),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CourseStatus | null;
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(search ? { title: { contains: search } } : {}),
  };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: {
        _count: { select: { enrollments: true, modules: true } },
        modules: {
          select: {
            _count: { select: { lessons: true } },
          },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  const data = courses.map((c) => ({
    ...c,
    enrollmentCount: c._count.enrollments,
    moduleCount: c._count.modules,
    lessonCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0),
  }));

  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({
    data,
    meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const { title, description, slug: providedSlug, thumbnailUrl, qcReward, sortOrder } =
    parsed.data;

  const slug = providedSlug ?? slugify(title);

  // Slug uniqueness check
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `Slug "${slug}" is already taken. Provide a different slug.` },
      { status: 409 },
    );
  }

  const course = await prisma.course.create({
    data: { title, description, slug, thumbnailUrl, qcReward, sortOrder, status: CourseStatus.DRAFT },
  });

  return NextResponse.json(course, { status: 201 });
}
