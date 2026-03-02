// app/api/admin/lessons/[lessonId]/route.ts
// GET / PATCH /api/admin/lessons/:lessonId

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const patchLessonSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  content: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  durationSecs: z.number().int().min(0).nullable().optional(),
  qcReward: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  return NextResponse.json(lesson);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;
  const body: unknown = await req.json();
  const parsed = patchLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  await prisma.lesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ deleted: true });
}
