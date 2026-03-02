// app/api/admin/courses/[courseId]/modules/route.ts
// POST /api/admin/courses/:courseId/modules — create a module

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const createModuleSchema = z.object({
  title: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).default(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = createModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const module = await prisma.courseModule.create({
    data: { courseId, title: parsed.data.title, sortOrder: parsed.data.sortOrder },
  });

  return NextResponse.json(module, { status: 201 });
}
