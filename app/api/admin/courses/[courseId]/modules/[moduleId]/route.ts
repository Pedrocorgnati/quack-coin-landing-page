// app/api/admin/courses/[courseId]/modules/[moduleId]/route.ts
// PATCH / DELETE /api/admin/courses/:courseId/modules/:moduleId

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.courseModule.update({
    where: { id: moduleId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleId } = await params;
  const module = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  await prisma.courseModule.delete({ where: { id: moduleId } });
  return NextResponse.json({ deleted: true });
}
