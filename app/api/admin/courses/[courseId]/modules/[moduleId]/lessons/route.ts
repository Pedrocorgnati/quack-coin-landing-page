// app/api/admin/courses/[courseId]/modules/[moduleId]/lessons/route.ts
// POST /api/admin/courses/:courseId/modules/:moduleId/lessons — create lesson

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { LessonType } from "@/lib/generated/prisma/client";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.nativeEnum(LessonType).default(LessonType.ARTICLE),
  content: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  durationSecs: z.number().int().min(0).nullable().optional(),
  qcReward: z.number().int().min(0).default(5),
  sortOrder: z.number().int().min(0).default(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleId } = await params;
  const module = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const lesson = await prisma.lesson.create({
    data: { courseModuleId: moduleId, ...parsed.data },
  });

  return NextResponse.json(lesson, { status: 201 });
}
